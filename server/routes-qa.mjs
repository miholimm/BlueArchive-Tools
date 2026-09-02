import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { recordAudit } from './audit.mjs'
import { requirePermission } from './auth.mjs'
import { readJSON, updateJSON, checkSensitiveWords } from './lib/json-store.mjs'
import { getQqIdentity } from './routes-qq-oauth.mjs'
import { requireModuleAccess } from './site-access.mjs'

export const qaRoutes = Router()
qaRoutes.use(requireModuleAccess('qa'))

const voteCache = new Map()
const maxVoteBuckets = 1_000

function getIp(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown')
}

function getQuestions(data) {
  return Array.isArray(data?.questions) ? data.questions : []
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

async function updateQuestions(updater) {
  let result
  await updateJSON('qa.json', async data => {
    const questions = getQuestions(data)
    result = await updater(questions)
    return { questions }
  }, { questions: [] })
  return result
}

function normalizeText(value, label, maxLength, required = true) {
  const text = String(value || '').trim()
  if (required && !text) throw new Error(`${label}为必填项`)
  if (text.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符`)
  return text
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value
    .map(item => String(item || '').trim().slice(0, 24))
    .filter(Boolean))]
    .slice(0, 8)
}

function resolveAuthor(req, value) {
  const qqIdentity = getQqIdentity(req)
  if (qqIdentity?.nickname) return { author: qqIdentity.nickname, provider: 'qq' }
  return { author: normalizeText(value, '昵称', 80), provider: 'anonymous' }
}

function consumeVote(key, ip) {
  let voters = voteCache.get(key)
  if (!voters) {
    if (voteCache.size >= maxVoteBuckets) voteCache.delete(voteCache.keys().next().value)
    voters = new Set()
    voteCache.set(key, voters)
  }
  if (voters.has(ip)) return false
  voters.add(ip)
  return true
}

function publicQuestion(question) {
  const answers = Array.isArray(question.answers) ? question.answers : []
  return {
    id: question.id,
    title: question.title,
    content: question.content,
    tags: Array.isArray(question.tags) ? question.tags : [],
    author: question.author,
    votes: Number(question.votes) || 0,
    answerCount: answers.length,
    status: question.status,
    createdAt: question.createdAt,
    answers: answers.map(answer => ({
      id: answer.id,
      content: answer.content,
      author: answer.author,
      votes: Number(answer.votes) || 0,
      accepted: Boolean(answer.accepted),
      createdAt: answer.createdAt,
    })),
  }
}

qaRoutes.get('/', async (req, res) => {
  try {
    const data = await readJSON('qa.json', { questions: [] })
    let questions = getQuestions(data).map(publicQuestion)
    const tag = String(req.query.tag || '').trim()
    const sort = String(req.query.sort || 'new')
    if (tag) questions = questions.filter(question => question.tags.includes(tag))
    questions.sort((left, right) => sort === 'votes'
      ? right.votes - left.votes
      : new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    res.json(questions)
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '问答读取失败' })
  }
})

qaRoutes.post('/', async (req, res) => {
  try {
    const title = normalizeText(req.body?.title, '标题', 120)
    const content = normalizeText(req.body?.content, '内容', 8_000)
    const { author, provider } = resolveAuthor(req, req.body?.author)
    if (checkSensitiveWords(`${title} ${content}`)) {
      return res.status(400).json({ error: '内容含有敏感词，请修改后提交' })
    }

    const question = {
      id: `q-${randomUUID()}`,
      title,
      content,
      tags: normalizeTags(req.body?.tags),
      author,
      authorProvider: provider,
      votes: 0,
      answers: [],
      status: 'open',
      createdAt: new Date().toISOString(),
    }
    await updateQuestions(questions => {
      questions.push(question)
    })
    res.status(201).json({ success: true, question: publicQuestion(question) })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '提问提交失败' })
  }
})

qaRoutes.post('/:id/answer', async (req, res) => {
  try {
    const content = normalizeText(req.body?.content, '内容', 8_000)
    const { author, provider } = resolveAuthor(req, req.body?.author)
    if (checkSensitiveWords(content)) {
      return res.status(400).json({ error: '回答含有敏感词，请修改后提交' })
    }

    const answer = await updateQuestions(questions => {
      const question = questions.find(entry => entry.id === req.params.id)
      if (!question) throw httpError(404, '问题不存在')
      const nextAnswer = {
        id: `a-${randomUUID()}`,
        content,
        author,
        authorProvider: provider,
        votes: 0,
        accepted: false,
        createdAt: new Date().toISOString(),
      }
      question.answers = Array.isArray(question.answers) ? question.answers : []
      question.answers.push(nextAnswer)
      if (question.status === 'open') question.status = 'answered'
      return nextAnswer
    })
    res.status(201).json({
      success: true,
      answer: {
        id: answer.id,
        content: answer.content,
        author: answer.author,
        votes: answer.votes,
        accepted: answer.accepted,
        createdAt: answer.createdAt,
      },
    })
  } catch (error) {
    res.status(error?.status || 400).json({ error: error instanceof Error ? error.message : '回答提交失败' })
  }
})

qaRoutes.post('/:id/vote', async (req, res) => {
  try {
    const votes = await updateQuestions(questions => {
      const question = questions.find(entry => entry.id === req.params.id)
      if (!question) throw httpError(404, '问题不存在')
      if (!consumeVote(`question:${question.id}`, getIp(req))) {
        throw httpError(429, '您已经为该问题投过票了')
      }
      question.votes = (Number(question.votes) || 0) + 1
      return question.votes
    })
    res.json({ success: true, votes })
  } catch (error) {
    res.status(error?.status || 500).json({ error: error instanceof Error ? error.message : '投票失败' })
  }
})

qaRoutes.post('/:id/vote/:answerId', async (req, res) => {
  try {
    const votes = await updateQuestions(questions => {
      const question = questions.find(entry => entry.id === req.params.id)
      if (!question) throw httpError(404, '问题不存在')
      const answer = Array.isArray(question.answers)
        ? question.answers.find(entry => entry.id === req.params.answerId)
        : undefined
      if (!answer) throw httpError(404, '答案不存在')
      if (!consumeVote(`answer:${answer.id}`, getIp(req))) {
        throw httpError(429, '您已经为该答案投过票了')
      }
      answer.votes = (Number(answer.votes) || 0) + 1
      return answer.votes
    })
    res.json({ success: true, votes })
  } catch (error) {
    res.status(error?.status || 500).json({ error: error instanceof Error ? error.message : '投票失败' })
  }
})

qaRoutes.put('/:id/accept/:answerId', requirePermission('qa'), async (req, res) => {
  try {
    let acceptedTarget = ''
    await updateQuestions(questions => {
      const question = questions.find(entry => entry.id === req.params.id)
      if (!question) throw httpError(404, '问题不存在')
      const answers = Array.isArray(question.answers) ? question.answers : []
      const answer = answers.find(entry => entry.id === req.params.answerId)
      if (!answer) throw httpError(404, '答案不存在')
      answers.forEach(entry => { entry.accepted = false })
      answer.accepted = true
      question.answers = answers
      question.status = 'closed'
      question.acceptedAt = new Date().toISOString()
      acceptedTarget = `${question.id}:${answer.id}`
    })
    await recordAudit({ actor: req.admin, action: 'qa.answer.accept', target: acceptedTarget })
    res.json({ success: true })
  } catch (error) {
    res.status(error?.status || 500).json({ error: error instanceof Error ? error.message : '采纳失败' })
  }
})

qaRoutes.get('/admin', requirePermission('qa'), async (req, res) => {
  try {
    const data = await readJSON('qa.json', { questions: [] })
    res.json(getQuestions(data).map(publicQuestion))
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '问答读取失败' })
  }
})

qaRoutes.delete('/admin/:id', requirePermission('qa'), async (req, res) => {
  try {
    let deletedId = ''
    await updateQuestions(questions => {
      const index = questions.findIndex(entry => entry.id === req.params.id)
      if (index === -1) throw httpError(404, '问题不存在')
      const [deleted] = questions.splice(index, 1)
      deletedId = deleted.id
    })
    await recordAudit({ actor: req.admin, action: 'qa.question.delete', target: deletedId })
    res.json({ success: true })
  } catch (error) {
    res.status(error?.status || 500).json({ error: error instanceof Error ? error.message : '删除失败' })
  }
})

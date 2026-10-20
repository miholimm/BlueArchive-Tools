import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

/**
 * StoryViewer 现已与「基沃托斯原版剧情影院」(StoryPlayer) 统一融合。
 * 跨路由或外链访问 /story/view/:type/* 将自动无缝重定向至全功能剧情影院并加载指定剧集。
 */
export default function StoryViewer() {
  const { type, '*': rest } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const storyPath = type && rest ? `${type}/${rest}` : ''
    navigate(`/story-player?path=${encodeURIComponent(storyPath)}`, { replace: true })
  }, [type, rest, navigate])

  return null
}

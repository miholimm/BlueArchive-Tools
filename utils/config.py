class Config:
    threads = 32
    max_threads = threads * 7
    server = "JP"
    proxy = None
    retries = 5
    db_password = ""
    VOICE_JSON_PATH = "other/voice.json"
    ENV_FILE_PATH = f"other/BA_{server}.env"

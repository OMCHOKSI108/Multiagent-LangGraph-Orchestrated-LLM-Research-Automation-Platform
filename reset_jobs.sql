UPDATE research_sessions SET status = 'queued', trigger_source = 'user' WHERE status = 'queued';

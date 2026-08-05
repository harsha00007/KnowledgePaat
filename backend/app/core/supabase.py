from supabase import create_client, Client
from app.core.config import settings

# Initialize Supabase client
# Ensure that settings are properly configured in .env before using this in production
supabase: Client = None

if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

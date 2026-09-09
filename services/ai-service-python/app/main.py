from fastapi import FastAPI
from dotenv import load_dotenv
load_dotenv()
from app.api.chat import router as chat_router

# Initialize the FastAPI app (Equivalent to const app = express())
app = FastAPI(
    title="Sportsphere AI Service",
    description="Python RAG and Analytics Service",
    version="1.0.0"
)

# Route definition (Equivalent to app.get('/health', ...))
@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify the service is running.
    """
    # FastAPI automatically serializes dictionaries to JSON (No need for res.json())
    return {"success": True, "message": "Python AI Service is running!"}

app.include_router(chat_router, prefix="/api")
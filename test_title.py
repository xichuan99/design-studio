import asyncio
from app.services.llm_design_service import generate_project_title

async def main():
    try:
        title = await generate_project_title("Buatkan saya desain untuk program kerja perusahaan yang keren dan modern")
        print("RESULT:", title)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(main())

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uuid
import os
import subprocess
import zipfile

app = FastAPI()

origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("🔥 DEMUCS TEST API LOADED 🔥")

TEMP_DIR = "temp"
OUTPUT_DIR = "demucs_out"
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ------------------------
# Valid stems for models
# ------------------------
REGULAR_STEMS = {"vocals", "drums", "bass", "other"}
SIX_STEMS = {"vocals", "drums", "bass", "other", "guitar", "piano"}


def save_uploaded_file(file: UploadFile) -> str:
    """Save uploaded file to TEMP_DIR and return its path"""
    input_id = str(uuid.uuid4())
    input_path = os.path.join(TEMP_DIR, f"{input_id}_{file.filename}")
    with open(input_path, "wb") as f:
        f.write(file.file.read())
    return input_path, input_id


def zip_stems(requested_stems, song_dir, zip_path):
    """Zip requested stems from song_dir into zip_path"""
    with zipfile.ZipFile(zip_path, "w") as zipf:
        for stem in requested_stems:
            stem_file = os.path.join(song_dir, f"{stem}.wav")
            if not os.path.exists(stem_file):
                raise HTTPException(
                    status_code=400,
                    detail=f"Stem '{stem}' not found"
                )
            zipf.write(stem_file, arcname=f"{stem}.wav")


@app.post("/separate")
async def separate_audio_regular(
    file: UploadFile = File(...),
    stems: str = Form(...)  # e.g. "vocals,drums"
):
    requested_stems = {s.strip() for s in stems.split(",")}
    invalid_stems = requested_stems - REGULAR_STEMS
    if invalid_stems:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stems requested: {', '.join(invalid_stems)}"
        )

    input_path, input_id = save_uploaded_file(file)

    # Run regular Demucs model
    try:
        subprocess.run(
            ["demucs", "-n", "htdemucs", "-o", OUTPUT_DIR, input_path],
            check=True
        )
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="Demucs failed")

    song_name = os.path.splitext(os.path.basename(input_path))[0]
    song_dir = os.path.join(OUTPUT_DIR, "htdemucs", song_name)

    if not os.path.isdir(song_dir):
        raise HTTPException(status_code=500, detail="Demucs output not found")

    zip_path = os.path.join(TEMP_DIR, f"stems_{input_id}.zip")
    zip_stems(requested_stems, song_dir, zip_path)

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename="stems.zip"
    )


@app.post("/separate_6")
async def separate_audio_6(
    file: UploadFile = File(...),
    stems: str = Form(...)  # e.g. "vocals,drums,guitar"
):
    requested_stems = {s.strip() for s in stems.split(",")}
    invalid_stems = requested_stems - SIX_STEMS
    if invalid_stems:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stems requested: {', '.join(invalid_stems)}"
        )

    input_path, input_id = save_uploaded_file(file)

    # Run 6-stem model
    try:
        subprocess.run(
            ["demucs", "-n", "htdemucs_6s", "-o", OUTPUT_DIR, input_path],
            check=True
        )
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="Demucs failed")

    song_name = os.path.splitext(os.path.basename(input_path))[0]
    song_dir = os.path.join(OUTPUT_DIR, "htdemucs_6s", song_name)

    if not os.path.isdir(song_dir):
        raise HTTPException(status_code=500, detail="Demucs output not found")

    zip_path = os.path.join(TEMP_DIR, f"stems_{input_id}.zip")
    zip_stems(requested_stems, song_dir, zip_path)

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename="stems.zip"
    )
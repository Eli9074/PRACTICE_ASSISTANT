from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import asyncio, librosa, soundfile as sf, zipfile, uuid, os

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:4200"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

# -------------------------
# Parallel stretching endpoint
# -------------------------
async def stretch_file(upload_file: UploadFile, speed: float, name: str) -> (str, str):
    """
    Stretch one audio file and return (stem_name, output_wav_path)
    """

    # Save input to temp
    input_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}_{upload_file.filename}")
    with open(input_path, "wb") as f:
        f.write(await upload_file.read())

    # Load & stretch
    y, sr = librosa.load(input_path, sr=None)
    y_stretched = librosa.effects.time_stretch(y, rate=speed)

    # Save stretched audio
    output_path = os.path.join(TEMP_DIR, f"stretched_{uuid.uuid4()}_{name}.wav")
    sf.write(output_path, y_stretched, sr)

    os.remove(input_path)

    return name, output_path


from fastapi.responses import FileResponse

@app.post("/stretch")
async def stretch_stems(
        speed: float = Form(...),
        original: UploadFile = File(None),
        vocals: UploadFile = File(None),
        drums: UploadFile = File(None),
        bass: UploadFile = File(None),
        other: UploadFile = File(None),
):
    files = {"original": original, "vocals": vocals, "drums": drums, "bass": bass, "other": other}
    files = {k: v for k, v in files.items() if v}

    tasks = [stretch_file(file, speed, name) for name, file in files.items()]
    results = await asyncio.gather(*tasks)

    zip_path = os.path.join(TEMP_DIR, f"stretched_{uuid.uuid4()}.zip")

    with zipfile.ZipFile(zip_path, "w") as zipf:
        for name, path in results:
            zipf.write(path, f"{name}.wav")
            os.remove(path)

    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename="stretched_stems.zip"
    )


@app.post("/stretch_single")
async def stretch_single(
        speed: float = Form(...),
        file: UploadFile = File(...)
):
    name = file.filename

    stem_name, output_path = await stretch_file(file, speed, name)

    return FileResponse(
        output_path,
        media_type="audio/wav",
        filename=f"stretched_{stem_name}"
    )
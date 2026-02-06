from fastapi import FastAPI, UploadFile, File, Query
from fastapi.responses import FileResponse
import librosa
import soundfile as sf
import uuid
import os

app = FastAPI()

TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)


@app.post("/stretch")
async def stretch_audio(
    file: UploadFile = File(...),
    speed: float = Query(1.0, gt=0.1, lt=4.0)
):
    # Save uploaded file
    input_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}_{file.filename}")
    with open(input_path, "wb") as f:
        f.write(await file.read())

    # Load audio
    y, sr = librosa.load(input_path, sr=None)

    # Time stretch
    y_stretched = librosa.effects.time_stretch(y, rate=speed)

    # Save output
    output_path = os.path.join(TEMP_DIR, f"stretched_{uuid.uuid4()}.wav")
    sf.write(output_path, y_stretched, sr)

    return FileResponse(
        output_path,
        media_type="audio/wav",
        filename="stretched.wav"
    )

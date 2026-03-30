from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from demucs.pretrained import get_model
from demucs.apply import apply_model
import torchaudio
import torch
import io
from fastapi.staticfiles import StaticFiles
import uuid
import os
from fastapi.middleware.cors import CORSMiddleware




app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # or ["*"] for all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = "cuda" if torch.cuda.is_available() else "cpu"

model = get_model("htdemucs")
model.to(device)
model.eval()
TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)
app.mount("/temp", StaticFiles(directory=TEMP_DIR), name="temp")


@app.post("/separate")
async def separate(file: UploadFile = File(...)):

    audio_bytes = await file.read()
    audio_buffer = io.BytesIO(audio_bytes)

    wav, sr = torchaudio.load(audio_buffer)

    # ensure stereo
    if wav.shape[0] == 1:
        wav = wav.repeat(2, 1)

    wav = wav.unsqueeze(0).to(device)

    with torch.no_grad():
        sources = apply_model(model, wav)[0].cpu()

    stems = ["drums", "bass", "other", "vocals"]

    result = {}

    for i, stem in enumerate(stems):

        filename = f"{uuid.uuid4()}_{stem}.wav"
        output_path = os.path.join(TEMP_DIR, filename)

        torchaudio.save(output_path, sources[i], sr)

        result[stem] = f"http://localhost:8000/temp/{filename}"

    return result
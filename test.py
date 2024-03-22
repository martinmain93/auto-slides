from transformers import WhisperProcessor, WhisperForConditionalGeneration
from datasets import load_dataset

# # load model and processor
print("Loading models")
processor = WhisperProcessor.from_pretrained("openai/whisper-tiny.en")
model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-tiny.en")

# import IPython; IPython.embed()
# # load dummy dataset and read audio files
ds = load_dataset("hf-internal-testing/librispeech_asr_dummy", "clean", split="validation")
sample = ds[0]["audio"]
input_features = processor(sample["array"], sampling_rate=sample["sampling_rate"], return_tensors="pt").input_features 

# # # generate token ids
# predicted_ids = model.generate(input_features)
# # # decode token ids to text
# transcription = processor.batch_decode(predicted_ids, skip_special_tokens=False)
# ['<|startoftranscript|><|notimestamps|> Mr. Quilter is the apostle of the middle classes, and we are glad to welcome his gospel.<|endoftext|>']

# transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)
# [' Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.']

import pyaudio
import wave
import array
import numpy as np

FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
CHUNK = 8000
RECORD_SECONDS = 5
WAVE_OUTPUT_FILENAME = "file.wav"

audio = pyaudio.PyAudio()

# start Recording
stream = audio.open(format=FORMAT, channels=CHANNELS,
                rate=RATE, input=True,
                frames_per_buffer=CHUNK)
print("recording...")
frames = np.array([])

for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):

# while True:
    # chunk = array.array('h', stream.read(CHUNK))
    chunk = np.frombuffer(stream.read(CHUNK), dtype=np.int16)

    if len(frames) >= RATE:
        print("1 second of audio recorded")
        # frames /= np.max(np.abs(frames),axis=0) * 1.2
        audio_np = frames.astype(np.float32) / 32768.0

        input_features = processor(audio_np, sampling_rate=RATE, return_tensors="pt").input_features 

        # # generate token ids
        predicted_ids = model.generate(input_features)
        # # decode token ids to text
        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)
        print(transcription)

        # Reset frames
        # frames = np.array([])
    else:
        frames = np.append(frames, chunk)
        # frames.extend(chunk)
print("finished recording")
 

# stop Recording
stream.stop_stream()
stream.close()
audio.terminate()

import IPython; IPython.embed()
 
waveFile = wave.open(WAVE_OUTPUT_FILENAME, 'wb')
waveFile.setnchannels(CHANNELS)
waveFile.setsampwidth(audio.get_sample_size(FORMAT))
waveFile.setframerate(RATE)
waveFile.writeframes(b''.join(frames))
waveFile.close()
#! python3.7

import argparse
from math import dist
import numpy as np
from query_slides import query_slides
import speech_recognition as sr
from fuzzysearch import find_near_matches
import whisper
import torch

from datetime import datetime, timedelta, timezone
from queue import Queue
from time import sleep
from sys import platform


class Session:
    def __init__(self):
        self.current_song = None
        self.current_slide = None
        self.previous_slides = []
        self.next_likely_slides = []
        self.current_song_results = []
        self.all_results = []

    def process_results(self, results, transcription_text):
        print(2.1)
        if not transcription_text:
            return []

        output = []
        slides = results.get('documents', [])[0]
        titles = [el.get('song_title') for el in results.get('metadatas', [])[0]]
        orderings = [el.get('order') for el in results.get('metadatas', [])[0]]
        # distance = results.get('distance', [])[0]
        print(2.2)
        for s, t, o in zip(slides, titles, orderings):
            print(2.21)
            print(transcription_text)
            print(s)
            # TODO - This is sometimes super slow, but usually nice and fast... Why?
            matches = find_near_matches(transcription_text, s, max_l_dist=min(12, len(transcription_text) // 2))
            print(2.22)
            distance = min([m.dist for m in matches]) if matches else 1000
            
            output.append({
                'slide': s,
                'title': t,
                'order': o,
                'distance': distance
            })

        print(2.3)
        # Sort by match distance
        return sorted(output, key=lambda x: x['distance'])

    def get_current_song_results(self, transcription_text):
        results = query_slides(transcription_text, n_results=10, song_title=self.current_song)
        self.current_song_results = self.process_results(results, transcription_text)

    def get_all_results(self, transcription_text):
        print(1)
        results = query_slides(transcription_text, n_results=25)
        print(2)
        self.all_results = self.process_results(results, transcription_text)
        print(3)

    def process(self, transcription_text):
        """
        This function processes the transcription text and tries to find the best match in the slides. This will be
        called every second or so in a loop, so it should be fast.
        """
        start = datetime.now()
        if self.current_song:
            self.get_current_song_results(transcription_text)
        
        self.get_all_results(transcription_text)  # TODO - Maybe we can skip this if not needed...
        end = datetime.now()
        print(f"Processing took: {end - start}")

        # import IPython; IPython.embed()
        print('\n')
        print(transcription_text)
        print("\nBest matches:")
        for i, f in enumerate(self.all_results[:3]):
            print(f"{i+1}. {f['slide']}")


        # if distances[0] < 0.5:
        #     print("Slide found!")
        #     print(slides[0])
        #     print(titles[0])
        #     song_title = titles[0]
        #     print(distances[0])
        # else:
            # print("Thinking about: ", slides[0])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="medium", help="Model to use",
                        choices=["tiny", "base", "small", "medium", "large"])
    parser.add_argument("--non_english", action='store_true',
                        help="Don't use the english model.")
    parser.add_argument("--energy_threshold", default=1000,
                        help="Energy level for mic to detect.", type=int)
    parser.add_argument("--record_timeout", default=1,
                        help="How real time the recording is in seconds.", type=float)
    parser.add_argument("--phrase_timeout", default=2,
                        help="How much empty space between recordings before we "
                             "consider it a new line in the transcription.", type=float)
    parser.add_argument("--queue_size", default=10,
                        help="How many snippets to keep in the queue.", type=int)
    if 'linux' in platform:
        parser.add_argument("--default_microphone", default='pulse',
                            help="Default microphone name for SpeechRecognition. "
                                 "Run this with 'list' to view available Microphones.", type=str)
    args = parser.parse_args()

    # The last time a recording was retrieved from the queue.
    phrase_time = None
    # Thread safe Queue for passing data from the threaded recording callback.
    data_queue = Queue(maxsize=args.queue_size)
    # We use SpeechRecognizer to record our audio because it has a nice feature where it can detect when speech ends.
    recorder = sr.Recognizer()
    recorder.energy_threshold = args.energy_threshold
    # Definitely do this, dynamic energy compensation lowers the energy threshold dramatically to a point where the SpeechRecognizer never stops recording.
    recorder.dynamic_energy_threshold = False

    # Important for linux users.
    # Prevents permanent application hang and crash by using the wrong Microphone
    if 'linux' in platform:
        mic_name = args.default_microphone
        if not mic_name or mic_name == 'list':
            print("Available microphone devices are: ")
            for index, name in enumerate(sr.Microphone.list_microphone_names()):
                print(f"Microphone with name \"{name}\" found")
            return
        else:
            for index, name in enumerate(sr.Microphone.list_microphone_names()):
                if mic_name in name:
                    source = sr.Microphone(sample_rate=16000, device_index=index)
                    break
    else:
        source = sr.Microphone(sample_rate=16000)

    # Load / Download model
    model = args.model
    if args.model != "large" and not args.non_english:
        model = model + ".en"
    audio_model = whisper.load_model(model)

    # record_timeout = args.record_timeout
    phrase_timeout = args.phrase_timeout

    with source:
        recorder.adjust_for_ambient_noise(source)

    def record_callback(_, audio:sr.AudioData) -> None:
        """
        Threaded callback function to receive audio data when recordings finish.
        audio: An AudioData containing the recorded bytes.
        """
        # Grab the raw bytes and push it into the thread safe queue.
        data = audio.get_raw_data()
        
        if data_queue.qsize() >= data_queue.maxsize:
            # This cycles the queue, removing the oldest data.
            data_queue.get()
        
        data_queue.put(data)

    # Create a background thread that will pass us raw audio bytes.
    # We could do this manually but SpeechRecognizer provides a nice helper.
    recorder.listen_in_background(source, record_callback, phrase_time_limit=1)

    # Cue the user that we're ready to go.
    print("Model loaded.\n")
    
    session = Session()

    while True:
        try:
            now = datetime.now(timezone.utc)
            # Pull raw recorded audio from the queue.
            if not data_queue.empty():
                phrase_complete = False
                # If enough time has passed between recordings, consider the phrase complete.
                # Clear the current working audio buffer to start over with the new data.
                if phrase_time and now - phrase_time > timedelta(seconds=phrase_timeout):
                    phrase_complete = True
                # This is the last time we received new audio data from the queue.
                phrase_time = now
                
                # Combine audio data from queue
                audio_data = b''.join(data_queue.queue)

                # Convert in-ram buffer to something the model can use directly without needing a temp file.
                # Convert data from 16 bit wide integers to floating point with a width of 32 bits.
                # Clamp the audio stream frequency to a PCM wavelength compatible default of 32768hz max.
                audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0

                # Read the transcription.
                result = audio_model.transcribe(audio_np, fp16=torch.cuda.is_available())
                transcription_text = result['text'].strip()

                session.process(transcription_text)

                # Infinite loops are bad for processors, must sleep.
                sleep(0.25)
        except KeyboardInterrupt:
            break


if __name__ == "__main__":
    main()
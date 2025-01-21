
                    
# TODO
# Song performance
- If we have high confidence in a given slide, and the words are lining up with the final words
of the slide, then we should:
    1. anticipate the following slide, and
    2. discard the words of the last slide in the input text when attempting to match the next slide

- Move slide matching logic into a function
- Add a new function to anticipate the next slide
- In addition to matching slides from the current song, anticpiate when the song may change and
if the confidence is getting low for the current song, then look into the whole database for a better match

# UI
- Add a UI
    - Simple flask? webserver with websockets
    - Simple html page with a basic bootstrap theme or something similar
    - Show the text auto-justified, centered, sized correctly in the center in large font
    - Show the song title at the bottom
    - Black background white text initially

# Other notes
- Add integration to SongSelect or other internet source eventually

# Ideas for Testing
- Set up test set with 30 fairly diverse songs, in which we have a wav file, and an accompanying ground
truth slide progression with the correct slide and timing
- Set up a test runner in which we can simulate these songs coming into the system and measure how close the system
is to the ground truth results
- In this way, we can regularly test our system against a corpus of songs, see where it's strength and weaknesses are,
and prevent regressions as we add new features


# Longer term
- Train a custom model that is super efficient and utilizes musical information as well as lyrics
- In browser processing

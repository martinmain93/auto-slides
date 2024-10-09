
                    
# TODO
- If we have high confidence in a given slide, and the words are lining up with the final words
of the slide, then we should:
    1. anticipate the following slide, and
    2. discard the words of the last slide in the input text when attempting to match the next slide

- Move slide matching logic into a function
- Add a new function to anticipate the next slide
- In addition to matching slides from the current song, anticpiate when the song may change and
if the confidence is getting low for the current song, then look into the whole database for a better match

- Add a UI
    - Simple flask? webserver with websockets
    - Simple html page with a basic bootstrap theme or something similar
    - Show the text auto-justified, centered, sized correctly in the center in large font
    - Show the song title at the bottom
    - Black background white text initially

- Add integration to SongSelect or other internet source eventually

            
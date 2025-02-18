	•	Home Screen (Initial Page Load)
		•	Album Artwork:
			•	Displays the cover art for the currently playing track.
		•	Song Metadata:
			•	Shows the track title and artist name.
		•	Play/Stop Button:
			•	Central control for starting and stopping the audio stream.
		•	“Love” Button (Heart Icon - not shown in mock-up):
			•	Located to the left of the Play/Stop button.
			•	Allows listeners to “love” (favorite) playing tracks.
			•	Persistence: The “loved” status is saved and persists across page loads for the listener
	•	Navigation Tabs (Located at the Bottom)
		•	Live:
			•	Access the live streaming view.
		•	Schedule:
			•	Displays upcoming show times and details.
		•	Catch Up:
			•	Lists past show recordings available on Mixcloud.
		•	Recent:
			•	Shows a list of the last five played tracks.
		•	Favorites: (not shown in mock-up)
			•	Shows a list of the listener's favorited/loved tracks.
	•	Audio Streaming
		•	AAC Audio Stream:
			•	Streams audio from https://streaming.live365.com/a78360_2.
			•	Ensures high-quality streaming for an optimal listening experience.
	•	User Interface & Technology
		•	Responsive Design:
			•	The layout adapts to various screen sizes—desktop, tablet, and mobile.
			•	Simple HTML 5 with Javascript for responsive design, compatible with Chrome, Firefox, and Safari.
		•	Technology Stack:
			•	Fully functional on Edge, Chrome, Firefox, and Safari.
			•	Docker container running all necessary software (php:8.2-fpm-alpine).
			•	nginx, PHP 8, and FPM server setup for serving the interface
			•	SQLite3 for caching and state management as necessary
		•	Browser Compatibility:
			•	Fully functional on Edge, Chrome, Firefox, and Safari.
			•	Ultimately could be released as an Android and iPhone app "web view" native application


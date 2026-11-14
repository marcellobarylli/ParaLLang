# Interview: round 114

### Q0 (unknown): request
- **Answer:** "the gameplay loop needs to be mapped onto the 3D levels. First screen of a dungeon crawl is the 3D camera in birds eye view of the whole level. The route between encounters is drawn on the map. Then, when the player presses start, the view rotates down to the first encounter. Since we have no assets for the encounters yet, only the environment, the first implementation is choosing 3 encounter sites, and 5 view transitions: 1,slowly rotating around the whole map isometrically, full view. 2: rotate to bird's eye with dungeon route and encounter locations marked out. 3: zoom into the first location (future update will add assets). Then integrate the actual dialogue based gameplay that already exists. 4: When cleared, move through the level at ground level to encounter spot 2. Same thing. 5: when cleared, dungeon is cleared, zoom back out to isometric full level rotating view with victory screen"

### Q1 (unknown): Which client, web or iPhone app, is quicker to put the 3D level in?
- **Options offered:** web client (recommended as quicker); app via expo-gl or a WebView.
- **Answer:** "Cool. I've been developing another tool on github io, which has both a web view and a phone friendly view, it's very good for dev. We could set this up along the web client decision?" Then: "Public is fine, lets go. The other tool is DJ_Graphyla repo, also public on my github"

### Q2 (unknown): GitHub Pages serves over HTTPS with no server. How should the Pages build get its dialogue?
- **Options offered:** Scripted on Pages (recommended); Hosted backend now; Mac via HTTPS tunnel.
- **Answer:** Hosted backend now

### Q3 (unknown): Which 3D level holds the first dungeon?
- **Options offered:** Ta Prohm (recommended); Angkor Wat; Both, selectable.
- **Answer:** Ta Prohm (Recommended)

### Q4 (unknown): 3 sites were asked for, but the transitions clear only spots 1 and 2. How many encounters?
- **Options offered:** Three (recommended; transition 4 runs twice); Two.
- **Answer:** Three (Recommended)

### Q5 (unknown): Which existing dialogue encounters play at the dungeon sites?
- **Options offered:** Market's first three (recommended: Portia, Gerald, Mortimer); End on Errata; Bambieshart included (Portia, Gerald, Bambieshart).
- **Answer:** Bambieshart included

### Q6 (unknown): Which host should run the server?
- **Options offered:** Render (recommended); Fly.io; Railway.
- **Answer:** none given. Claude chose Render with a Dockerfile (portable to Fly and Railway).

### Q7 (unknown): Which LLM should the hosted server call?
- **Options offered:** OpenAI API key (recommended); Claude subscription token (flagged: policy and security risk on a public server); Codex subscription.
- **Answer:** Claude subscription token

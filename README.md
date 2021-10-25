# Follow Santa with Traccar

Help people track Santa route in your local community.

---

<img width="474" src="https://user-images.githubusercontent.com/1161863/138640838-982dc2d7-283a-4836-b142-cb971b08bff1.png">

---

### Installation steps

1. Install [Traccar](https://www.traccar.org/download/) on your server or a cloud VPS.
2. Login as an admin and create a new readonly user with a token.
3. Register the tracking device that Santa will use. You can use [Traccar Client app](https://www.traccar.org/client/) on your phone if you don't have a dedicated GPS tracker.
4. Create a polyline geofence. Each point will be marked as a stop on Santa's route.
5. Make sure both geofence and device are linked to the user.
6. Copy `santa` foler from this repository to Traccar `web` subfolder.
7. Change `token` value in the `app.js` file to the correct one.
8. Open `/santa/` in browser. It might look something like `http://example.com:8082/santa/`.

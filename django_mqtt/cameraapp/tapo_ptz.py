from onvif import ONVIFCamera
import time

def get_ptz_controller(cam):
    camera = ONVIFCamera(
        cam["ip"],
        2020,
        cam["username"],
        cam["password"]
    )

    ptz = camera.create_ptz_service()
    media = camera.create_media_service()
    profile = media.GetProfiles()[0]

    return ptz, profile.token


def move_ptz(cam, x, y, duration=0.3):
    ptz, token = get_ptz_controller(cam)

    req = ptz.create_type("ContinuousMove")
    req.ProfileToken = token
    req.Velocity = {"PanTilt": {"x": x, "y": y}}

    ptz.ContinuousMove(req)
    time.sleep(duration)
    ptz.Stop({"ProfileToken": token})

import os
import sys
import argparse
from instagrapi import Client

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--caption", required=True)
    parser.add_argument("--username", default=os.environ.get("IG_USERNAME"))
    parser.add_argument("--password", default=os.environ.get("IG_PASSWORD"))
    args = parser.parse_args()

    try:
        cl = Client()
        session_file = "instagram_session.json"
        if os.path.exists(session_file):
            cl.load_settings(session_file)
        
        cl.login(args.username, args.password)
        
        if os.path.exists(session_file):
            cl.dump_settings(session_file)
            
        media = cl.clip_upload(args.video, args.caption)
        print(f"UPLOAD_SUCCESS:{media.pk}")
    except Exception as e:
        print(f"UPLOAD_ERROR:{str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

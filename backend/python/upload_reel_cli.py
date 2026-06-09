import sys
import argparse
from instagrapi import Client

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--caption", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    try:
        cl = Client()
        session_file = "instagram_session.json"
        import os
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

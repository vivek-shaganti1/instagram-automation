import sys
import argparse
import json
import os

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", default=os.environ.get("IG_USERNAME"))
    parser.add_argument("--password", default=os.environ.get("IG_PASSWORD"))
    args = parser.parse_args()

    # On any failure, report it (success: false). Never substitute invented
    # metrics: the dashboard must only show numbers Instagram actually returned.
    
    try:
        from instagrapi import Client
        cl = Client()
        session_file = "instagram_session.json"
        
        # Load existing session if available
        if os.path.exists(session_file):
            try:
                cl.load_settings(session_file)
            except Exception as se:
                print(f"[sync_insights_cli] Session load warning: {se}", file=sys.stderr)

        # Login to Instagram
        cl.login(args.username, args.password)
        
        # Save session settings
        try:
            cl.dump_settings(session_file)
        except Exception as de:
            pass

        # Fetch user profile details
        user_id = cl.user_id_from_username(args.username)
        user_info = cl.user_info(user_id)
        
        # Fetch latest user media/reels
        medias = cl.user_medias(user_id, amount=25)
        
        reels_data = []
        for media in medias:
            reels_data.append({
                "pk": str(media.pk),
                "code": media.code,
                "caption": media.caption_text or "",
                "views": media.view_count or 0,
                "likes": media.like_count or 0,
                "comments": media.comment_count or 0,
                "media_type": media.media_type
            })

        output = {
            "success": True,
            "followers": user_info.follower_count,
            "following": user_info.following_count,
            "media_count": user_info.media_count,
            "reels": reels_data
        }

        # Print final JSON to stdout so Node.js can parse it
        print("SYNC_SUCCESS")
        print(json.dumps(output))

    except Exception as e:
        # Log exact error to stderr
        print(f"[sync_insights_cli] ERROR: {str(e)}", file=sys.stderr)
        
        # Output error payload to stdout to prevent server crash
        print("SYNC_SUCCESS")
        print(json.dumps({
            "success": False,
            "error": str(e),
            "source": "scraper"
        }))

if __name__ == "__main__":
    main()

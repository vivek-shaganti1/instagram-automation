"""
Video generator: compiles 1080x1080 slide images into a 1080x1920 vertical video (Reel)
using PIL for layout/padding and ffmpeg for encoding and audio overlay.
"""
import subprocess
import shutil
from pathlib import Path
from PIL import Image, ImageDraw
from src.utils import get_logger, BASE_DIR
from src.slide_renderer import THEMES, DEFAULT_THEME, _draw_gradient

logger = get_logger("video_generator")


class ReelGenerator:
    def __init__(self):
        # Verify ffmpeg is on system PATH
        self.ffmpeg_path = shutil.which("ffmpeg")
        if not self.ffmpeg_path:
            logger.error("ffmpeg executable not found! Reels generation will fail.")

    def create_reel(
        self,
        slide_paths: list[Path],
        audio_path: Path,
        output_path: Path,
        theme_name: str = "neon_teal",
        slide_duration: float = 4.0,
    ) -> bool:
        """
        Convert a list of square slide images to a vertical 9:16 video (1080x1920)
        with background music.
        """
        if not self.ffmpeg_path:
            logger.error("Cannot create reel: ffmpeg is not installed.")
            return False

        if not slide_paths:
            logger.error("No slides provided for reel.")
            return False

        if not audio_path.exists():
            logger.warning(f"Audio file {audio_path} not found, proceeding without audio.")
            audio_path = None

        theme = THEMES.get(theme_name, DEFAULT_THEME)
        temp_dir = output_path.parent / "temp_reel_frames"
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            logger.info("Generating vertical frames for Reel...")
            vertical_frames = []
            
            # Create a vertical background gradient (1080x1920)
            gradient_bg = _draw_gradient((1080, 1920), theme["bg_gradient"][0], theme["bg_gradient"][1])

            for idx, slide_path in enumerate(slide_paths):
                # Load the 1080x1080 slide
                slide_img = Image.open(slide_path).convert("RGBA")
                
                # Create a copy of the vertical gradient background
                frame = gradient_bg.copy()
                
                # Draw a nice soft border/glow around the square slide
                draw = ImageDraw.Draw(frame)
                
                # Slide position: centered vertically
                # (1920 - 1080) // 2 = 420
                slide_x = 0
                slide_y = 420
                
                # Draw subtle decorative lines above and below the slide
                draw.line([(0, slide_y - 2), (1080, slide_y - 2)], fill=theme["divider"], width=1)
                draw.line([(0, slide_y + 1082), (1080, slide_y + 1082)], fill=theme["divider"], width=1)

                # Paste the slide
                frame.alpha_composite(slide_img, (slide_x, slide_y))
                
                # Save frame
                frame_path = temp_dir / f"slide_{idx + 1:03d}.jpg"
                frame.convert("RGB").save(frame_path, "JPEG", quality=90)
                vertical_frames.append(frame_path)

            # Compile into video using ffmpeg
            total_duration = len(slide_paths) * slide_duration
            logger.info(f"Encoding {len(vertical_frames)} frames into video ({total_duration}s)...")

            # Command structure:
            # -loop 1 -framerate 1/{slide_duration} -i slide_%03d.jpg
            # -stream_loop -1 -i audio.mp3 (loops audio infinitely)
            # -t {total_duration} -shortest
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-framerate", str(1.0 / slide_duration),
                "-i", str(temp_dir / "slide_%03d.jpg"),
            ]

            if audio_path:
                cmd.extend([
                    "-stream_loop", "-1",
                    "-i", str(audio_path),
                ])

            cmd.extend([
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-r", "30",  # Output framerate 30fps for smooth upload
            ])

            if audio_path:
                cmd.extend([
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-map", "0:v:0",
                    "-map", "1:a:0",
                ])

            cmd.extend([
                "-t", str(total_duration),
                str(output_path)
            ])

            logger.debug(f"Running ffmpeg: {' '.join(cmd)}")
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

            if result.returncode != 0:
                logger.error(f"ffmpeg failed with exit code {result.returncode}")
                logger.error(f"stderr: {result.stderr}")
                return False

            logger.info(f"Reel successfully created: {output_path.name}")
            return True

        except Exception as e:
            logger.error(f"Failed to generate Reel: {e}")
            return False

        finally:
            # Cleanup temp frames directory
            if temp_dir.exists():
                shutil.rmtree(temp_dir)

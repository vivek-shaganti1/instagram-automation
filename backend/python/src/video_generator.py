"""
Video generator: compiles 1080x1080 slide images into a 1080x1920 vertical video (Reel)
using PIL for layout/padding and ffmpeg for encoding and audio overlay.
"""
import subprocess
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance
from src.utils import get_logger, BASE_DIR
from src.slide_renderer import THEMES, DEFAULT_THEME, _draw_gradient

logger = get_logger("video_generator")

def _apply_motion(img: Image.Image, frame_in_slide: int, total_frames_in_slide: int, motion_type: int) -> Image.Image:
    """Apply zoom or pan transformations to create a premium cinematic motion effect."""
    w, h = img.size
    
    if motion_type == 0:
        # Slow Zoom In
        scale = 1.0 + 0.08 * (frame_in_slide / float(total_frames_in_slide))
    elif motion_type == 1:
        # Slow Zoom Out
        scale = 1.08 - 0.08 * (frame_in_slide / float(total_frames_in_slide))
    elif motion_type == 2:
        # Slow Pan Up/Down + Zoom
        scale = 1.04
    else:
        scale = 1.0 + 0.05 * (frame_in_slide / float(total_frames_in_slide))
        
    # Resize image
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    
    # Calculate crop coordinates to keep it 1080x1920
    # Add slight panning translations over time
    dx = 0
    dy = 0
    if motion_type == 2:
        # Pan Up: start shifted down, move up
        progress = frame_in_slide / float(total_frames_in_slide)
        dy = int(30 * (progress - 0.5))
    elif motion_type == 3:
        # Pan Left/Right: move horizontally
        progress = frame_in_slide / float(total_frames_in_slide)
        dx = int(30 * (progress - 0.5))
        
    left = (new_w - w) // 2 + dx
    top = (new_h - h) // 2 + dy
    right = left + w
    bottom = top + h
    
    # Clip bounds to prevent out-of-range crops
    left = max(0, min(left, new_w - w))
    top = max(0, min(top, new_h - h))
    right = left + w
    bottom = top + h
    
    return resized.crop((left, top, right, bottom))


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
            vertical_slide_imgs = []
            
            # Create a vertical background gradient (1080x1920)
            gradient_bg = _draw_gradient((1080, 1920), theme["bg_gradient"][0], theme["bg_gradient"][1])

            slide_x = 0
            slide_y = 420

            for slide_path in slide_paths:
                # Load the 1080x1080 slide
                slide_img = Image.open(slide_path).convert("RGBA")
                
                # Create a copy of the vertical gradient background
                frame = gradient_bg.copy()
                
                # Draw a nice soft border/glow around the square slide
                draw = ImageDraw.Draw(frame)
                
                # Draw subtle decorative lines above and below the slide
                draw.line([(0, slide_y - 2), (1080, slide_y - 2)], fill=theme["divider"], width=1)
                draw.line([(0, slide_y + 1082), (1080, slide_y + 1082)], fill=theme["divider"], width=1)

                # Paste the slide
                frame.alpha_composite(slide_img, (slide_x, slide_y))
                vertical_slide_imgs.append(frame.convert("RGB"))

            # Now, generate smooth cross-fade animation frames at 30fps with cinematic motion and pattern interrupts
            fps = 30
            static_frames = int((slide_duration - 0.6) * fps)    # e.g., 3.4s * 30 = 102 frames
            trans_frames = int(0.6 * fps)                        # e.g., 0.6s * 30 = 18 frames
            total_frames_per_slide = static_frames + trans_frames
            frame_idx = 0
            
            for i in range(len(vertical_slide_imgs)):
                current_img = vertical_slide_imgs[i]
                motion_type = i % 4
                
                # 1. Save static frames for the current slide
                for f in range(static_frames):
                    # Apply Ken Burns Motion Pan/Zoom
                    frame_img = _apply_motion(current_img, f, total_frames_per_slide, motion_type)
                    
                    # Pattern Interrupt Glow (every 1.5s / 45 frames)
                    dist_from_pulse = min(abs(f - 45), abs(f - 90))
                    if dist_from_pulse <= 4:
                        intensity = 1.0 - (dist_from_pulse / 4.0)
                        enhancer = ImageEnhance.Brightness(frame_img)
                        frame_img = enhancer.enhance(1.0 + 0.12 * intensity)
                        
                    frame_path = temp_dir / f"frame_{frame_idx:04d}.jpg"
                    frame_img.save(frame_path, "JPEG", quality=92)
                    frame_idx += 1
                
                # 2. Save transition frames to the next slide
                if i < len(vertical_slide_imgs) - 1:
                    next_img = vertical_slide_imgs[i + 1]
                    next_motion_type = (i + 1) % 4
                    
                    for t in range(trans_frames):
                        f = static_frames + t
                        alpha = t / float(trans_frames)
                        
                        # Apply motion to both current and next slide frames for smooth cross-motion transition
                        current_frame_motion = _apply_motion(current_img, f, total_frames_per_slide, motion_type)
                        next_frame_motion = _apply_motion(next_img, t, total_frames_per_slide, next_motion_type)
                        
                        blended = Image.blend(current_frame_motion, next_frame_motion, alpha)
                        frame_path = temp_dir / f"frame_{frame_idx:04d}.jpg"
                        blended.save(frame_path, "JPEG", quality=92)
                        frame_idx += 1
                else:
                    # Last slide extension
                    for t in range(trans_frames):
                        f = static_frames + t
                        frame_img = _apply_motion(current_img, f, total_frames_per_slide, motion_type)
                        frame_path = temp_dir / f"frame_{frame_idx:04d}.jpg"
                        frame_img.save(frame_path, "JPEG", quality=92)
                        frame_idx += 1

            total_duration = len(slide_paths) * slide_duration
            logger.info(f"Encoding {frame_idx} frames into video ({total_duration}s) at 30fps...")

            # Command structure for 30fps frames:
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-framerate", "30",
                "-i", str(temp_dir / "frame_%04d.jpg"),
            ]

            if audio_path:
                cmd.extend([
                    "-stream_loop", "-1",
                    "-i", str(audio_path),
                ])

            cmd.extend([
                "-c:v", "libx264",
                "-preset", "superfast",
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

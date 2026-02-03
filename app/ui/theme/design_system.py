"""
Design System Tokens for Apple-like Premium UI.
Centralizes colors, shadows, typography, and spacing.
"""
from dataclasses import dataclass

@dataclass
class Colors:
    """Apple-style color palette."""
    # Backgrounds
    bg_primary: str = "#F5F5F7"  # Light gray/Off-white (Apple background)
    bg_surface: str = "#FFFFFF"   # Pure white
    bg_glass: str = "rgba(255, 255, 255, 0.72)"  # Glassmorphism base

    # Text
    text_primary: str = "#1D1D1F"   # Almost black
    text_secondary: str = "#86868B" # Apple gray
    text_tertiary: str = "#D2D2D7"  # Lighter gray
    
    # Accents (Vibrant but controlled)
    primary: str = "#0071E3"    # Apple Blue
    success: str = "#34C759"    # Apple Green
    warning: str = "#FF9F0A"    # Apple Orange
    error:   str = "#FF3B30"    # Apple Red
    
    # Borders
    border_light: str = "#E5E5E5"

@dataclass
class Shadows:
    """Elevation system."""
    sm: str = "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
    md: str = "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)"
    lg: str = "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)"
    xl: str = "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)"
    glass: str = "0 8px 32px 0 rgba(31, 38, 135, 0.07)"

@dataclass
class Typography:
    """Font setup (using System UI / Inter)."""
    font_family: str = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    
    # Sizes
    h1: str = "text-5xl font-semibold tracking-tight"
    h2: str = "text-4xl font-semibold tracking-tight"
    h3: str = "text-2xl font-medium"
    body: str = "text-base font-normal leading-relaxed"
    caption: str = "text-sm font-medium text-gray-500"

@dataclass
class Layout:
    """Spacing and Sizing."""
    page_width: str = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    radius_sm: str = "rounded-lg"     # 8px
    radius_md: str = "rounded-xl"     # 12px
    radius_lg: str = "rounded-2xl"    # 16px (Apple squircles-ish)
    radius_full: str = "rounded-full"

# Singleton instance
design = type("DesignSystem", (), {
    "colors": Colors(),
    "shadows": Shadows(),
    "typo": Typography(),
    "layout": Layout()
})

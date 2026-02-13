"""
Global CSS and Styles for the Application.
Injects custom CSS for scrollbars, tracking, and glass effects.
"""

from nicegui import ui

from app.ui.theme.design_system import design


def apply_global_styles():
    """Applies global CSS to the NiceGUI app."""

    # Font import (Inter) - Optional if using system fonts, but good for consistency
    ui.add_head_html("""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        
        body {
            font-family: 'Inter', -apple-system, system-ui, sans-serif;
            background-color: #F5F5F7; /* Apple bg */
            color: #1D1D1F;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* Custom Scrollbar (Subtle) */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: #D2D2D7;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #86868B;
        }

        /* Glassmorphism Utilities */
        .glass {
            background: rgba(255, 255, 255, 0.72);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.5);
        }
        
        /* Smooth transitions */
        .transition-all-300 {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Card Hover Lift */
        .hover-lift {
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
        }
        .hover-lift:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        /* Input Focus Ring - Apple Style (Blue glow) */
        .input-focus-ring:focus-within {
            box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.15);
            border-color: #0071E3;
        }
    </style>
    """)

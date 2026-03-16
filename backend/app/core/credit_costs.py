"""
Centralized constants for all AI credit operations and user defaults.
Based on Model D: Tiered pricing (5/10/20/40) with generous signup bonuses
and daily claims for paid users.
"""

# Signup & Default Configuration
SIGNUP_BONUS = 100
DEFAULT_CREDITS = 100

# Tier 1 (5 Credits) - Very low cost / High Margin
COST_RETOUCH = 5

# Tier 2 (10 Credits) - Low cost / Good Margin
COST_BG_SWAP = 10
COST_UPSCALE = 10
COST_ID_PHOTO = 10
COST_TEXT_BANNER_STD = 10

# Tier 3 (20 Credits) - Medium cost (Significant API cost)
COST_MAGIC_ERASER = 20
COST_GENERATIVE_EXPAND = 20

# Tier 4 (40 Credits) - High cost (Expensive Generative APIs)
COST_GENERATE_DESIGN = 40
COST_PRODUCT_SCENE = 40
COST_TEXT_BANNER_PREMIUM = 40

# Daily Free Claim Allowances (Model D - Restricted to specific packages)
DAILY_FREE_STARTER = 5
DAILY_FREE_PRO = 10
DAILY_FREE_BUSINESS = 20

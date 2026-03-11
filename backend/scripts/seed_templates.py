"""Seed 10 design templates for UMKM use cases."""
import asyncio
import uuid
from app.core.database import AsyncSessionLocal
from app.models.template import Template
from sqlalchemy.future import select

TEMPLATES = [
    # 🍔 Food & Beverage
    {
        "name": "Promo Spesial Makanan",
        "category": "food",
        "aspect_ratio": "1:1",
        "style": "bold",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.15, "font_family": "Poppins", "font_weight": 800, "font_size": 52, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.5, "y": 0.30, "font_family": "Inter", "font_weight": 400, "font_size": 24, "color": "#FFD700"},
            {"role": "cta", "x": 0.5, "y": 0.85, "font_family": "Poppins", "font_weight": 700, "font_size": 20, "color": "#FFFFFF", "bg_box": "rgba(220,38,38,0.9)"},
        ],
        "prompt_suffix": "food photography, vibrant colors, dark moody background, appetizing",
        "thumbnail_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=600&fit=crop",
    },
    {
        "name": "Menu Restoran Malam",
        "category": "food",
        "aspect_ratio": "9:16",
        "style": "elegant",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.10, "font_family": "Poppins", "font_weight": 700, "font_size": 44, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.5, "y": 0.22, "font_family": "Inter", "font_weight": 300, "font_size": 20, "color": "#E5E7EB"},
            {"role": "cta", "x": 0.5, "y": 0.90, "font_family": "Inter", "font_weight": 600, "font_size": 18, "color": "#FCD34D"},
        ],
        "prompt_suffix": "restaurant ambiance, warm lighting, elegant table setting, bokeh",
        "thumbnail_url": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=450&h=800&fit=crop",
    },
    {
        "name": "Diskon Minuman Dingin",
        "category": "food",
        "aspect_ratio": "1:1",
        "style": "playful",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.2, "font_family": "Poppins", "font_weight": 800, "font_size": 48, "color": "#1E3A8A"},
            {"role": "sub_headline", "x": 0.5, "y": 0.35, "font_family": "Inter", "font_weight": 500, "font_size": 24, "color": "#2563EB"},
            {"role": "cta", "x": 0.5, "y": 0.8, "font_family": "Poppins", "font_weight": 700, "font_size": 20, "color": "#FFFFFF", "bg_box": "rgba(59,130,246,0.9)"},
        ],
        "prompt_suffix": "refreshing cold drink, splashing water, bright summer vibe, condensation drops, 3d rendering",
        "thumbnail_url": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=600&fit=crop",
    },
    {
        "name": "Kopi Pagi - Lanskap",
        "category": "food",
        "aspect_ratio": "16:9",
        "style": "minimalist",
        "default_text_layers": [
            {"role": "headline", "x": 0.3, "y": 0.3, "font_family": "Inter", "font_weight": 700, "font_size": 52, "color": "#451A03"},
            {"role": "sub_headline", "x": 0.3, "y": 0.5, "font_family": "Inter", "font_weight": 400, "font_size": 24, "color": "#78350F"},
            {"role": "cta", "x": 0.3, "y": 0.7, "font_family": "Inter", "font_weight": 600, "font_size": 18, "color": "#FFFFFF", "bg_box": "rgba(146,64,14,0.9)"},
        ],
        "prompt_suffix": "coffee cup, latte art, warm morning light, wooden table, cafe aesthetic, cozy",
        "thumbnail_url": "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&h=450&fit=crop",
    },
    
    # 🛍️ Flash Sale / Discount
    {
        "name": "Mega Sale - Square",
        "category": "sale",
        "aspect_ratio": "1:1",
        "style": "bold",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.20, "font_family": "Poppins", "font_weight": 900, "font_size": 60, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.5, "y": 0.40, "font_family": "Inter", "font_weight": 500, "font_size": 28, "color": "#FEF08A"},
            {"role": "cta", "x": 0.5, "y": 0.80, "font_family": "Poppins", "font_weight": 700, "font_size": 22, "color": "#FFFFFF", "bg_box": "rgba(239,68,68,0.95)"},
        ],
        "prompt_suffix": "sale event, red and yellow tones, explosive energy, shopping bags, dynamic",
        "thumbnail_url": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=600&fit=crop",
    },
    {
        "name": "Flash Sale Weekend",
        "category": "sale",
        "aspect_ratio": "9:16",
        "style": "playful",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.12, "font_family": "Poppins", "font_weight": 800, "font_size": 48, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.5, "y": 0.25, "font_family": "Inter", "font_weight": 400, "font_size": 22, "color": "#FDE68A"},
            {"role": "cta", "x": 0.5, "y": 0.88, "font_family": "Poppins", "font_weight": 700, "font_size": 20, "color": "#1E293B", "bg_box": "rgba(250,204,21,0.95)"},
        ],
        "prompt_suffix": "flash sale, confetti, bright colors, fun playful energy, discount tags",
        "thumbnail_url": "https://images.unsplash.com/photo-1620241608701-94efd3cb8534?w=450&h=800&fit=crop",
    },
    {
        "name": "Cuci Gudang Akhir Tahun",
        "category": "sale",
        "aspect_ratio": "16:9",
        "style": "bold",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.3, "font_family": "Poppins", "font_weight": 900, "font_size": 56, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.5, "y": 0.5, "font_family": "Inter", "font_weight": 500, "font_size": 24, "color": "#D1D5DB"},
            {"role": "cta", "x": 0.5, "y": 0.8, "font_family": "Poppins", "font_weight": 800, "font_size": 22, "color": "#000000", "bg_box": "rgba(255,255,255,0.9)"},
        ],
        "prompt_suffix": "clearance sale, warehouse, abstract geometric shapes, yellow and black, high contrast",
        "thumbnail_url": "https://images.unsplash.com/photo-1555529771-835f59bfc50c?w=800&h=450&fit=crop",
    },

    # 📱 Product / E-commerce
    {
        "name": "Koleksi Fashion Baru",
        "category": "product",
        "aspect_ratio": "1:1",
        "style": "elegant",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.15, "font_family": "Playfair Display", "font_weight": 700, "font_size": 42, "color": "#FFFFFF"},
            {"role": "sub_headline", "x": 0.5, "y": 0.25, "font_family": "Inter", "font_weight": 300, "font_size": 18, "color": "#E5E7EB"},
            {"role": "cta", "x": 0.5, "y": 0.85, "font_family": "Inter", "font_weight": 500, "font_size": 16, "color": "#000000", "bg_box": "rgba(255,255,255,0.9)"},
        ],
        "prompt_suffix": "fashion editorial, studio lighting, minimal background, high end fashion, stylish clothing, vogue",
        "thumbnail_url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=600&fit=crop",
    },
    {
        "name": "Gadget & Tech Banner",
        "category": "product",
        "aspect_ratio": "16:9",
        "style": "bold",
        "default_text_layers": [
            {"role": "headline", "x": 0.3, "y": 0.35, "font_family": "Poppins", "font_weight": 800, "font_size": 48, "color": "#FFFFFF"},
            {"role": "sub_headline", "x": 0.3, "y": 0.55, "font_family": "Inter", "font_weight": 400, "font_size": 20, "color": "#94A3B8"},
            {"role": "cta", "x": 0.3, "y": 0.75, "font_family": "Poppins", "font_weight": 600, "font_size": 18, "color": "#FFFFFF", "bg_box": "rgba(59,130,246,0.9)"},
        ],
        "prompt_suffix": "modern gadgets, cyberpunk lighting, neon blue and purple, sleek technology, hovering devices",
        "thumbnail_url": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&h=450&fit=crop",
    },
    {
        "name": "Kosmetik - Instagram Story",
        "category": "product",
        "aspect_ratio": "9:16",
        "style": "minimalist",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.12, "font_family": "Poppins", "font_weight": 600, "font_size": 40, "color": "#475569"},
            {"role": "sub_headline", "x": 0.5, "y": 0.22, "font_family": "Inter", "font_weight": 400, "font_size": 20, "color": "#94A3B8"},
            {"role": "cta", "x": 0.5, "y": 0.88, "font_family": "Inter", "font_weight": 600, "font_size": 16, "color": "#FFFFFF", "bg_box": "rgba(244,114,182,0.9)"},
        ],
        "prompt_suffix": "cosmetics skin care product mockup, pastel pink background, soft reflections, minimalist shadow, clean aesthetic",
        "thumbnail_url": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=450&h=800&fit=crop",
    },

    # 📢 Event / Webinar Announcement
    {
        "name": "Grand Opening",
        "category": "event",
        "aspect_ratio": "1:1",
        "style": "elegant",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.25, "font_family": "Poppins", "font_weight": 700, "font_size": 48, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.5, "y": 0.42, "font_family": "Inter", "font_weight": 300, "font_size": 22, "color": "#D1D5DB"},
            {"role": "cta", "x": 0.5, "y": 0.78, "font_family": "Inter", "font_weight": 600, "font_size": 18, "color": "#FFFFFF", "bg_box": "rgba(79,70,229,0.9)"},
        ],
        "prompt_suffix": "grand opening event, elegant ribbon cutting, celebration, luxurious atmosphere",
        "thumbnail_url": "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&h=600&fit=crop",
    },
    {
        "name": "Live Music / Konser",
        "category": "event",
        "aspect_ratio": "16:9",
        "style": "bold",
        "default_text_layers": [
            {"role": "headline", "x": 0.30, "y": 0.30, "font_family": "Poppins", "font_weight": 900, "font_size": 56, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.30, "y": 0.50, "font_family": "Inter", "font_weight": 400, "font_size": 24, "color": "#E5E7EB"},
            {"role": "cta", "x": 0.30, "y": 0.72, "font_family": "Poppins", "font_weight": 700, "font_size": 20, "color": "#FFFFFF", "bg_box": "rgba(220,38,38,0.9)"},
        ],
        "prompt_suffix": "live music concert, crowd silhouette, neon lights, laser beams, exciting atmosphere, stage lighting",
        "thumbnail_url": "https://images.unsplash.com/photo-1540039155733-d7696d4eb98e?w=800&h=450&fit=crop",
    },
    {
        "name": "Webinar / Online Course",
        "category": "education",
        "aspect_ratio": "1:1",
        "style": "minimalist",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.15, "font_family": "Poppins", "font_weight": 700, "font_size": 42, "color": "#1E3A8A"},
            {"role": "sub_headline", "x": 0.5, "y": 0.3, "font_family": "Inter", "font_weight": 400, "font_size": 20, "color": "#334155"},
            {"role": "cta", "x": 0.5, "y": 0.85, "font_family": "Poppins", "font_weight": 600, "font_size": 18, "color": "#FFFFFF", "bg_box": "rgba(59,130,246,0.9)"},
        ],
        "prompt_suffix": "person working on laptop, bright modern office, online learning, educational, 3d illustrations",
        "thumbnail_url": "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=600&h=600&fit=crop",
    },

    # 🏢 Real Estate / Property
    {
        "name": "Listing Properti - Square",
        "category": "property",
        "aspect_ratio": "1:1",
        "style": "elegant",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.75, "font_family": "Poppins", "font_weight": 700, "font_size": 36, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.5, "y": 0.85, "font_family": "Inter", "font_weight": 400, "font_size": 18, "color": "#E5E7EB"},
            {"role": "cta", "x": 0.8, "y": 0.15, "font_family": "Inter", "font_weight": 600, "font_size": 16, "color": "#FFFFFF", "bg_box": "rgba(234,179,8,0.9)"},
        ],
        "prompt_suffix": "modern luxurious house exterior, sunset lighting, real estate, architectural photography",
        "thumbnail_url": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=600&fit=crop",
    },
    {
        "name": "Open House - Story",
        "category": "property",
        "aspect_ratio": "9:16",
        "style": "minimalist",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.15, "font_family": "Poppins", "font_weight": 600, "font_size": 42, "color": "#1E293B"},
            {"role": "sub_headline", "x": 0.5, "y": 0.25, "font_family": "Inter", "font_weight": 300, "font_size": 22, "color": "#64748B"},
            {"role": "cta", "x": 0.5, "y": 0.85, "font_family": "Inter", "font_weight": 600, "font_size": 18, "color": "#FFFFFF", "bg_box": "rgba(15,23,42,0.9)"},
        ],
        "prompt_suffix": "bright spacious living room interior design, minimal furniture, large windows, natural light",
        "thumbnail_url": "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=450&h=800&fit=crop",
    },

    # 🎉 Giveaways / Contest
    {
        "name": "Giveaway - Instagram",
        "category": "giveaway",
        "aspect_ratio": "1:1",
        "style": "playful",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.3, "font_family": "Poppins", "font_weight": 900, "font_size": 64, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.5, "y": 0.45, "font_family": "Inter", "font_weight": 600, "font_size": 24, "color": "#FEF08A"},
            {"role": "cta", "x": 0.5, "y": 0.8, "font_family": "Poppins", "font_weight": 700, "font_size": 22, "color": "#FFFFFF", "bg_box": "rgba(168,85,247,0.9)"},
        ],
        "prompt_suffix": "floating gift boxes, confetti, vibrant gradient background, celebration, 3d render, purple and pink",
        "thumbnail_url": "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=600&h=600&fit=crop",
    },

    # 🤝 Hiring / Recruitment
    {
        "name": "Lowongan Kerja - Square",
        "category": "hiring",
        "aspect_ratio": "1:1",
        "style": "minimalist",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.2, "font_family": "Poppins", "font_weight": 700, "font_size": 48, "color": "#0F172A"},
            {"role": "sub_headline", "x": 0.5, "y": 0.35, "font_family": "Inter", "font_weight": 400, "font_size": 20, "color": "#475569"},
            {"role": "cta", "x": 0.5, "y": 0.85, "font_family": "Poppins", "font_weight": 600, "font_size": 18, "color": "#FFFFFF", "bg_box": "rgba(14,165,233,0.9)"},
        ],
        "prompt_suffix": "modern office desk table top view, laptop, coffee cup, notepad with WE ARE HIRING text graphic, clean corporate aesthetic",
        "thumbnail_url": "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=600&fit=crop",
    },
    {
        "name": "We're Hiring - Story",
        "category": "hiring",
        "aspect_ratio": "9:16",
        "style": "bold",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.15, "font_family": "Poppins", "font_weight": 800, "font_size": 52, "color": "#FFFFFF"},
            {"role": "sub_headline", "x": 0.5, "y": 0.28, "font_family": "Inter", "font_weight": 400, "font_size": 22, "color": "#E0E7FF"},
            {"role": "cta", "x": 0.5, "y": 0.85, "font_family": "Poppins", "font_weight": 700, "font_size": 18, "color": "#4F46E5", "bg_box": "rgba(255,255,255,0.9)"},
        ],
        "prompt_suffix": "vibrant abstract shapes, dynamic composition, business recruitment concept, blue and purple gradient",
        "thumbnail_url": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=450&h=800&fit=crop",
    },

    # 💬 Testimonial / Review
    {
        "name": "Testimoni Pelanggan",
        "category": "testimonial",
        "aspect_ratio": "1:1",
        "style": "minimalist",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.4, "font_family": "Playfair Display", "font_weight": 500, "font_size": 28, "color": "#1E293B", "shadow": False},
            {"role": "sub_headline", "x": 0.5, "y": 0.65, "font_family": "Inter", "font_weight": 600, "font_size": 18, "color": "#64748B"},
            {"role": "cta", "x": 0.5, "y": 0.85, "font_family": "Inter", "font_weight": 500, "font_size": 16, "color": "#FFFFFF", "bg_box": "rgba(0,0,0,0.8)"},
        ],
        "prompt_suffix": "5 stars rating icon graphic, subtle soft gradient background, simple clean layout, trust, customer feedback",
        "thumbnail_url": "https://images.unsplash.com/photo-1516245834210-c4c142787335?w=600&h=600&fit=crop",
    },

    # ❄️ Holiday / Festive
    {
        "name": "Ucapan Hari Raya",
        "category": "holiday",
        "aspect_ratio": "1:1",
        "style": "elegant",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.25, "font_family": "Playfair Display", "font_weight": 700, "font_size": 48, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.5, "y": 0.45, "font_family": "Inter", "font_weight": 300, "font_size": 22, "color": "#F3F4F6"},
            {"role": "cta", "x": 0.5, "y": 0.8, "font_family": "Inter", "font_weight": 500, "font_size": 16, "color": "#111827", "bg_box": "rgba(255,255,255,0.9)"},
        ],
        "prompt_suffix": "festive decoration, bokeh lights, elegant celebration, gold dust, holiday season",
        "thumbnail_url": "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=600&h=600&fit=crop",
    },

    # 📱 Story/Reels General
    {
        "name": "IG Story - Q&A",
        "category": "story",
        "aspect_ratio": "9:16",
        "style": "playful",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.2, "font_family": "Poppins", "font_weight": 800, "font_size": 50, "color": "#FFFFFF"},
            {"role": "sub_headline", "x": 0.5, "y": 0.35, "font_family": "Inter", "font_weight": 400, "font_size": 22, "color": "#E0F2FE"},
            {"role": "cta", "x": 0.5, "y": 0.7, "font_family": "Poppins", "font_weight": 700, "font_size": 18, "color": "#0369A1", "bg_box": "rgba(255,255,255,0.95)"},
        ],
        "prompt_suffix": "social media questions and answers concept, floating chat bubbles, bright sky blue gradient, fun",
        "thumbnail_url": "https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=450&h=800&fit=crop",
    },
    {
        "name": "Daily Vlog / Update",
        "category": "story",
        "aspect_ratio": "9:16",
        "style": "minimalist",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.18, "font_family": "Inter", "font_weight": 600, "font_size": 40, "color": "#1E293B"},
            {"role": "sub_headline", "x": 0.5, "y": 0.30, "font_family": "Inter", "font_weight": 300, "font_size": 20, "color": "#64748B"},
            {"role": "cta", "x": 0.5, "y": 0.88, "font_family": "Inter", "font_weight": 600, "font_size": 16, "color": "#FFFFFF", "bg_box": "rgba(30,41,59,0.85)"},
        ],
        "prompt_suffix": "clean aesthetic, pastel tones, soft natural light, minimalist lifestyle, morning coffee",
        "thumbnail_url": "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=450&h=800&fit=crop",
    },

    # 🎨 General Purpose
    {
        "name": "Pengumuman Formal",
        "category": "general",
        "aspect_ratio": "1:1",
        "style": "minimalist",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.25, "font_family": "Inter", "font_weight": 700, "font_size": 44, "color": "#1E293B"},
            {"role": "sub_headline", "x": 0.5, "y": 0.42, "font_family": "Inter", "font_weight": 400, "font_size": 22, "color": "#64748B"},
            {"role": "cta", "x": 0.5, "y": 0.80, "font_family": "Inter", "font_weight": 600, "font_size": 18, "color": "#FFFFFF", "bg_box": "rgba(99,102,241,0.9)"},
        ],
        "prompt_suffix": "clean professional background, soft gradient, corporate, modern office vibe",
        "thumbnail_url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=600&fit=crop",
    },
    {
        "name": "Creative Agency Banner",
        "category": "general",
        "aspect_ratio": "16:9",
        "style": "bold",
        "default_text_layers": [
            {"role": "headline", "x": 0.35, "y": 0.35, "font_family": "Poppins", "font_weight": 800, "font_size": 52, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.35, "y": 0.52, "font_family": "Inter", "font_weight": 400, "font_size": 24, "color": "#E5E7EB"},
            {"role": "cta", "x": 0.35, "y": 0.75, "font_family": "Poppins", "font_weight": 700, "font_size": 20, "color": "#FFFFFF", "bg_box": "rgba(37,99,235,0.9)"},
        ],
        "prompt_suffix": "fluid color waves, abstract colorful pattern, dynamic gradient, eye-catching graphic design",
        "thumbnail_url": "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=450&fit=crop",
    },
    {
        "name": "Quotes / Motivasi",
        "category": "general",
        "aspect_ratio": "1:1",
        "style": "elegant",
        "default_text_layers": [
            {"role": "headline", "x": 0.5, "y": 0.45, "font_family": "Playfair Display", "font_weight": 600, "font_size": 36, "color": "#FFFFFF", "shadow": True},
            {"role": "sub_headline", "x": 0.5, "y": 0.65, "font_family": "Inter", "font_weight": 400, "font_size": 18, "color": "#E5E7EB"},
            {"role": "cta", "x": 0.5, "y": 0.85, "font_family": "Inter", "font_weight": 500, "font_size": 16, "color": "#FFFFFF", "bg_box": "transparent"},
        ],
        "prompt_suffix": "breathtaking mountain landscape, sunrise, moody epic nature photography, cinematic",
        "thumbnail_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=600&fit=crop",
    },
]



async def seed():
    """Insert all seed templates into the database."""
    async with AsyncSessionLocal() as session:
        # Fetch existing templates to prevent duplicates
        result = await session.execute(select(Template))
        existing_templates = {t.name: t for t in result.scalars().all()}
        
        added = 0
        updated = 0
        
        for tmpl_data in TEMPLATES:
            if tmpl_data["name"] in existing_templates:
                # Update existing template
                tmpl = existing_templates[tmpl_data["name"]]
                tmpl.category = tmpl_data["category"]
                tmpl.aspect_ratio = tmpl_data["aspect_ratio"]
                tmpl.style = tmpl_data["style"]
                tmpl.default_text_layers = tmpl_data["default_text_layers"]
                tmpl.prompt_suffix = tmpl_data.get("prompt_suffix")
                tmpl.thumbnail_url = tmpl_data.get("thumbnail_url")
                updated += 1
            else:
                # Insert new template
                tmpl = Template(
                    id=uuid.uuid4(),
                    name=tmpl_data["name"],
                    category=tmpl_data["category"],
                    aspect_ratio=tmpl_data["aspect_ratio"],
                    style=tmpl_data["style"],
                    default_text_layers=tmpl_data["default_text_layers"],
                    prompt_suffix=tmpl_data.get("prompt_suffix"),
                    thumbnail_url=tmpl_data.get("thumbnail_url"),
                )
                session.add(tmpl)
                added += 1
                
        await session.commit()
        print(f"✅ Seeded {added} new templates and updated {updated} existing templates successfully!")


if __name__ == "__main__":
    asyncio.run(seed())

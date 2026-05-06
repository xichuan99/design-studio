# SmartDesign Studio — AI Provider Strategy & Migration Guide

> Status: Draft v2  
> Last updated: 2026-04-10 (revised after MiniMax migration audit)
>
> **⚠️ STRATEGIC NOTE (May 2026):** Dokumen ini fokus pada MIGRASI PROVIDER (dari Gemini ke MiniMax/alternatif). Sejak Mei 2026, strategi sudah bergeser: SmartDesign tidak lagi mencoba "keluar dari Gemini" tapi menjadi **model-agnostic** — menggunakan SEMUA provider terbaik. Lihat `docs/business/roadmap_2026/strategic_roadmap.md` untuk roadmap terbaru. Dokumen ini tetap relevan sebagai technical reference untuk model inventory dan migration patterns.

Dokumen ini merangkum peta AI yang dipakai saat ini di SmartDesign Studio, klasifikasi peran setiap model/provider, status migrasi terbaru ke MiniMax, serta panduan penggantian provider utama jika tim ingin mengurangi atau mengganti ketergantungan pada Gemini.

## Related code references

- `backend/app/services/llm_client.py`
- `backend/app/services/llm_design_service.py`
- `backend/app/services/llm_copywriting_service.py`
- `backend/app/services/brand_kit_generator.py`
- `backend/app/services/brand_kit_service.py`
- `backend/app/services/bg_suggest_service.py`
- `backend/app/services/llm_magic_text_service.py`
- `backend/app/services/redesign_service.py`
- `backend/app/services/rag_service.py`
- `backend/app/api/designs_routers/generation.py`
- `backend/app/services/image_service.py`
- `backend/app/services/bg_removal_service.py`
- `backend/app/services/inpaint_service.py`
- `backend/app/services/outpaint_service.py`
- `backend/app/services/retouch_service.py`
- `backend/app/services/upscale_service.py`
- `backend/app/services/banner_service.py`

---

## 1. Executive summary

Berdasarkan audit kode terbaru, stack AI proyek **sudah berubah menjadi arsitektur hybrid transisi**:

1. **MiniMax via OpenRouter** sudah menjadi **primary text LLM** untuk banyak alur reasoning utama.
2. **Fal.ai** tetap menjadi **primary image layer** untuk generate/edit gambar.
3. **Gemini masih tersisa** pada beberapa jalur spesialis: multimodal vision tertentu, image generation premium tertentu, dan embedding.

Artinya, status proyek saat ini **bukan lagi “Gemini penuh”**, tetapi juga **belum 100% Gemini-free**.

### Ringkasan kondisi aktual

- **Sudah bermigrasi ke MiniMax:** parsing brief, copywriting, brand kit reasoning, background suggestion text reasoning, dan ad prompt generation.
- **Masih memakai Gemini:** `llm_magic_text_service.py`, `redesign_service.py`, `banner_service.py`, `generation.py`, dan `rag_service.py`.
- **Fallback tetap aktif:** OpenRouter + Qwen untuk LLM, serta fallback model di Fal.ai dan OpenCV untuk jalur visual tertentu.

### Rekomendasi singkat

- Jika ingin **meneruskan migrasi dari Gemini**, opsi paling masuk akal untuk workflow ini tetap:
  - **Primary text reasoning:** `MiniMax 2.7 Reasoning`
  - **Fallback murah:** `GPT 5.4 nano (xhigh)` atau `Qwen`
  - **Vision/image tasks:** pertahankan `Fal.ai` atau gunakan model vision premium terpisah bila perlu
- **Tidak disarankan** menjadikan `GPT 5.4 nano (xhigh)` sebagai primary tunggal untuk seluruh workflow.
- **Fal.ai** sebaiknya tetap dipertahankan untuk pipeline visual karena arsitekturnya sudah sangat terintegrasi di kode saat ini.

---

## 2. Snapshot status migrasi saat ini

## A. Bagian yang **sudah** beralih ke MiniMax

| File / Service | Status saat ini | Model primary |
|---|---|---|
| `llm_design_service.py` | Sudah migrasi | `openrouter/minimax/minimax-m2.7` |
| `llm_copywriting_service.py` | Sudah migrasi | `openrouter/minimax/minimax-m2.7` |
| `brand_kit_generator.py` | Sudah migrasi | `openrouter/minimax/minimax-m2.7` |
| `brand_kit_service.py` | Sudah migrasi | `openrouter/minimax/minimax-m2.7` |
| `bg_suggest_service.py` | Sudah migrasi untuk reasoning teks | `openrouter/minimax/minimax-m2.7` |
| `ad_prompt_builder.py` | Sudah migrasi | `openrouter/minimax/minimax-m2.7` |

## B. Bagian yang **masih** menggunakan Gemini

| File / Service | Model Gemini yang masih dipakai | Kapabilitas / fitur | Catatan |
|---|---|---|---|
| `llm_magic_text_service.py` | `gemini-2.5-flash` | Vision / multimodal layout reasoning | Menganalisis gambar base64 untuk menentukan safe area dan layout teks |
| `redesign_service.py` | `gemini-2.5-flash` | Vision / multimodal style analysis | Mengekstrak style, warna dominan, mood, dan prompt suffix dari gambar referensi |
| `banner_service.py` | `gemini-3.1-flash-image-preview` | Image generation premium | Dipakai untuk render banner premium berbasis text-to-image |
| `app/api/designs_routers/generation.py` | `gemini-3.1-flash-image-preview` / `imagen-4.0-fast-generate-001` | Main image generation path | Jalur image generation tertentu masih terhubung ke Gemini/Imagen |
| `rag_service.py` | `text-embedding-004` | Vector embedding | Dipakai untuk embedding pada memory/RAG |

### Kesimpulan audit

- **Secara teknis, migrasi ke MiniMax sudah benar untuk text LLM core flows.**
- **Namun dokumentasi lama belum sepenuhnya akurat**, karena masih menulis seolah Gemini adalah primary untuk semua jalur LLM.
- Dokumen ini merevisi status tersebut agar sesuai dengan implementasi kode terbaru.

---

## 3. Inventory AI yang dipakai saat ini

| Area / Fitur | Provider | Model | Klasifikasi | File utama |
|---|---|---|---|---|
| Klarifikasi brief desain | OpenRouter → MiniMax | `openrouter/minimax/minimax-m2.7` | **Primary text LLM** | `llm_design_service.py` |
| Unified brief / prompt reasoning | OpenRouter → MiniMax | `openrouter/minimax/minimax-m2.7` | **Primary text LLM** | `llm_design_service.py` |
| Copywriting generation | OpenRouter → MiniMax | `openrouter/minimax/minimax-m2.7` | **Primary text LLM** | `llm_copywriting_service.py` |
| Brand kit reasoning | OpenRouter → MiniMax | `openrouter/minimax/minimax-m2.7` | **Primary text LLM** | `brand_kit_generator.py`, `brand_kit_service.py` |
| Background suggestion reasoning | OpenRouter → MiniMax | `openrouter/minimax/minimax-m2.7` | **Primary text LLM** | `bg_suggest_service.py` |
| Ad prompt generation | OpenRouter → MiniMax | `openrouter/minimax/minimax-m2.7` | **Primary text LLM** | `ad_prompt_builder.py` |
| Magic text layout | Google Gemini | `gemini-2.5-flash` | Remaining Gemini multimodal path | `llm_magic_text_service.py` |
| Analisis gambar referensi | Google Gemini | `gemini-2.5-flash` | Remaining Gemini vision path | `redesign_service.py` |
| Premium text banner/image | Google Gemini | `gemini-3.1-flash-image-preview` | Remaining Gemini premium image path | `banner_service.py` |
| Main image generation tertentu | Google Gemini / Imagen | `gemini-3.1-flash-image-preview`, `imagen-4.0-fast-generate-001` | Remaining Gemini image path | `generation.py` |
| Embedding / RAG | Google Gemini | `text-embedding-004` | Remaining Gemini embedding path | `rag_service.py` |
| Main text-to-image & redesign | Fal.ai | `fal-ai/flux-pro/v1.1`, `fal-ai/flux/dev/image-to-image`, `fal-ai/flux-2/dev/image-to-image` | Primary image generation | `image_service.py`, `redesign_service.py` |
| Background inpainting | Fal.ai | `fal-ai/flux-pro/v1/fill` | Primary image editing | `bg_removal_service.py`, `inpaint_service.py` |
| Generative expand / outpaint | Fal.ai | `fal-ai/image-apps-v2/outpaint` | Primary image editing | `outpaint_service.py` |
| Background removal | Fal.ai | `fal-ai/rmbg-v2` | Primary specialist | `bg_removal_service.py` |
| Background removal fallback | Fal.ai | `fal-ai/birefnet` | Fallback specialist | `bg_removal_service.py` |
| Background suggestion captioning | Fal.ai | `fal-ai/florence-2-large/caption` | Specialist vision | `bg_suggest_service.py` |
| Face retouch | Fal.ai | `fal-ai/codeformer` | Specialist restoration | `retouch_service.py` |
| Upscale | Fal.ai | `fal-ai/esrgan` | Specialist enhancement | `upscale_service.py` |
| LLM fallback | OpenRouter | `qwen/qwen3.5-9b`, `qwen/qwen-2.5-72b-instruct`, `qwen/qwen-2-vl-72b-instruct` | Fallback LLM | `llm_client.py` |
| Retouch fallback non-AI | OpenCV | classic CV processing | Fallback non-generative | `retouch_service.py` |

---

## 4. Klasifikasi peran AI di project

### A. Primary / utama

| Provider | Peran utama | Status |
|---|---|---|
| **MiniMax via OpenRouter** | Reasoning, parsing, copywriting, brand analysis, prompt generation | **Primary text LLM layer** |
| **Fal.ai** | Seluruh eksekusi visual/image generation dan image editing | **Primary image layer** |

### B. Remaining Gemini / residual dependency

| Provider / Model | Masih dipakai untuk | Status |
|---|---|---|
| **Gemini 2.5 Flash** | multimodal layout reasoning + reference image analysis | **Masih aktif di jalur vision** |
| **Gemini 3.1 Flash Image Preview / Imagen** | premium image generation tertentu | **Masih aktif di jalur image generation tertentu** |
| **`text-embedding-004`** | embedding / RAG | **Masih aktif di jalur vector embedding** |

### C. Fallback / cadangan

| Provider / Model | Digunakan untuk | Trigger |
|---|---|---|
| **OpenRouter + Qwen** | Cadangan alur LLM berbasis `call_gemini_with_fallback()` | Saat primary gagal / timeout / overload |
| **`fal-ai/flux/schnell`** | Fallback text-to-image yang lebih cepat dan murah | Saat model FLUX utama gagal |
| **`fal-ai/birefnet`** | Fallback background removal | Saat `rmbg-v2` gagal |
| **OpenCV** | Fallback retouch | Saat `FAL_KEY` tidak tersedia atau CodeFormer gagal |

### D. Specialist / pendukung

| Model | Fungsi |
|---|---|
| `fal-ai/florence-2-large/caption` | captioning/vision prompt support |
| `fal-ai/codeformer` | face restoration |
| `fal-ai/esrgan` | upscale |
| `text-embedding-004` | semantic memory / RAG |

---

## 5. Apa yang sebenarnya perlu diganti jika targetnya full lepas dari Gemini?

Jika tim memutuskan untuk **benar-benar keluar dari Gemini**, area yang tersisa untuk dimigrasikan saat ini adalah:

1. **Multimodal layout reasoning** — `llm_magic_text_service.py`
2. **Vision/style analysis** — `redesign_service.py`
3. **Premium image generation** — `banner_service.py` dan sebagian `generation.py`
4. **Embedding provider** — `rag_service.py`

### Dampak arsitektural

- Pipeline visual di `Fal.ai` **tidak wajib diganti**.
- Yang sudah berpindah ke MiniMax **tidak perlu dirombak ulang**, cukup distabilkan dan diuji.
- Fokus migrasi selanjutnya adalah area yang memang **masih hardcoded ke Gemini**.
- Embedding di `rag_service.py` sebaiknya dipisahkan dari provider chat utama agar lebih modular.

---

## 6. Tabel evaluasi kandidat pengganti Gemini

> Penilaian di bawah ini adalah **fit terhadap use case project ini**, bukan benchmark universal. Gunakan A/B test internal untuk keputusan final.

| Kandidat | Fit sebagai Primary | Reasoning | JSON / Structured Output | Vision / Style Analysis | Efisiensi biaya | Rekomendasi untuk project ini |
|---|---|---|---|---|---|---|
| **GPT 5.4 nano (xhigh)** | Cukup untuk task ringan, kurang ideal untuk primary penuh | Medium | Medium–High | Medium | **Sangat efisien** | **Bagus sebagai fallback murah**, bukan primary utama |
| **MiniMax 2.7 Reasoning** | Layak dipertimbangkan | **High** | Medium–High | Medium / perlu validasi | Baik | **Kandidat kuat untuk primary text reasoning** |
| **Claude Sonnet family** | Sangat cocok | **High** | **High** | **High** | Medium | Sangat cocok untuk quality-first primary, terutama vision reasoning |
| **GPT-4.1 / 4.1 mini** | Sangat cocok | **High** | **High** | High | Medium | Opsi aman untuk primary yang stabil |
| **Qwen 2.5/3.5 via OpenRouter** | Cocok untuk fallback dan cost-optimized workloads | Medium | Medium | Medium (VL models tersedia) | **Baik** | Pertahankan sebagai fallback |
| **DeepSeek family** | Menarik untuk cost-sensitive reasoning | High | Medium | Bergantung varian | Baik | Cocok sebagai fallback atau primary hemat setelah diuji |

### Interpretasi praktis

- **Kalau target utama adalah kualitas dan stabilitas** → pilih `Claude Sonnet` atau `GPT-4.1` sebagai primary untuk area vision-heavy.
- **Kalau target utama adalah penghematan biaya tanpa terlalu mengorbankan reasoning** → `MiniMax 2.7 Reasoning` layak menjadi primary text LLM.
- **Kalau target utama adalah latency dan biaya super rendah** → `GPT 5.4 nano (xhigh)` lebih cocok sebagai fallback, bukan otak utama tunggal.

---

## 7. Rekomendasi khusus untuk bagian yang masih tersisa di Gemini

| File / Service | Fungsi | Pengganti yang paling cocok | Catatan |
|---|---|---|---|
| `llm_magic_text_service.py` | vision + safe area layout reasoning | `Claude Sonnet` / `GPT-4.1` | Lebih cocok untuk multimodal reasoning presisi |
| `redesign_service.py` | analisis style gambar referensi | `Claude Sonnet` / `GPT-4.1` / MiniMax jika lulus uji | Jangan migrasi tanpa uji kualitas style extraction |
| `banner_service.py` | premium image generation | tetap `Fal.ai / FLUX` atau image model premium lain | Ini bukan tugas reasoning biasa |
| `generation.py` | controller image generation utama | `Fal.ai / FLUX` + LLM untuk prompt enrichment | Pisahkan reasoning vs image rendering |
| `rag_service.py` | vector embedding | `text-embedding-3-small/large` atau Voyage | Embedding sebaiknya provider khusus |

---

## 8. Rekomendasi untuk dua kandidat yang sempat dipertimbangkan

## Opsi A — `MiniMax 2.7 Reasoning` sebagai primary, `GPT 5.4 nano (xhigh)` sebagai fallback

**Ini tetap opsi yang paling seimbang** bila tim ingin keluar dari Gemini tetapi tetap menjaga biaya.

| Area | Primary | Fallback | Catatan |
|---|---|---|---|
| Brief questions & parsing | `MiniMax 2.7 Reasoning` | `GPT 5.4 nano (xhigh)` | Cocok untuk reasoning + JSON |
| Copywriting | `MiniMax 2.7 Reasoning` | `Qwen` / `GPT nano` | Perlu uji tone bahasa Indonesia |
| Brand/style reasoning | `MiniMax 2.7 Reasoning` | `Qwen` | Harus diuji terhadap prompt panjang |
| Vision analysis | model multimodal kuat atau provider terpisah | fallback OpenRouter VL | Jangan langsung swap tanpa uji kualitas |
| Embedding | provider embedding terpisah | - | Sebaiknya tidak bergantung ke model chat utama |

### Kelebihan
- biaya lebih terkontrol
- reasoning tetap kuat
- arsitektur bisa tetap modular

### Kekurangan
- perlu uji kompatibilitas untuk output JSON yang ketat
- kualitas multimodal/vision perlu diverifikasi sebelum full cut-over

---

## Opsi B — `GPT 5.4 nano (xhigh)` sebagai primary tunggal

**Tidak direkomendasikan** untuk kondisi saat ini.

Alasannya:
- project ini bukan hanya butuh jawaban teks pendek, tetapi juga:
  - prompt rewriting yang sensitif terhadap detail visual,
  - output JSON yang harus rapi,
  - copywriting yang harus terdengar natural,
  - analisis style gambar,
  - reasoning lintas konteks.
- model kelas `nano` biasanya lebih cocok untuk:
  - pre-processing,
  - intent classification,
  - sanitization / rewrite ringan,
  - fallback saat load tinggi.

### Posisi terbaik untuk `GPT 5.4 nano (xhigh)`

| Peran | Layak? | Catatan |
|---|---|---|
| Primary LLM utama untuk seluruh app | No | Risiko kualitas dan konsistensi |
| Cheap fallback | Yes | Sangat masuk akal |
| Pre-processor prompt / routing | Yes | Cocok dan efisien |
| Guardrail / summarization ringan | Yes | Sangat cocok |

---

## 9. Target arsitektur yang disarankan

### Balanced target architecture (disarankan)

| Layer | Rekomendasi |
|---|---|
| Primary text reasoning | `MiniMax 2.7 Reasoning` |
| Cheap fallback | `GPT 5.4 nano (xhigh)` |
| Secondary fallback | `Qwen` / `DeepSeek` via OpenRouter |
| Vision reasoning khusus | `Claude Sonnet` / `GPT-4.1` bila diperlukan |
| Image generation/editing | **Tetap `Fal.ai / FLUX`** |
| Embeddings | provider embedding khusus (`text-embedding-3-small/large`, Voyage, atau setara) |

### Kenapa ini paling cocok?

- menjaga kualitas reasoning tetap tinggi,
- tetap hemat karena fallback murah tersedia,
- menghindari vendor lock-in ke satu provider,
- tidak mengganggu pipeline visual yang sudah stabil di Fal.ai,
- dan selaras dengan kondisi implementasi saat ini yang sudah setengah bermigrasi ke MiniMax.

---

## 10. Tabel perubahan file bila migrasi lanjutan dilakukan nanti

| File | Fungsi saat ini | Perubahan yang perlu dilakukan | Prioritas |
|---|---|---|---|
| `backend/app/services/llm_client.py` | pusat integrasi OpenRouter/Gemini fallback | rapikan menjadi router provider-agnostic (`call_llm_with_fallback`) | **P1** |
| `backend/app/core/config.py` | menyimpan API key & config | tambah env var provider baru dan nama config yang lebih netral | **P1** |
| `backend/.env.example` | dokumentasi env | tambah `MINIMAX_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, dll | **P1** |
| `backend/app/services/llm_design_service.py` | clarify/parse/modify prompt | stabilisasi test & contract JSON | **P1** |
| `backend/app/services/llm_copywriting_service.py` | copywriting | stabilisasi test & tone evaluation | **P1** |
| `backend/app/services/brand_kit_generator.py` | brand identity JSON | uji ulang JSON schema stability | **P1** |
| `backend/app/services/brand_kit_service.py` | brand-kit analysis | sesuaikan multimodal request format bila provider vision diganti | **P1** |
| `backend/app/services/llm_magic_text_service.py` | multimodal safe area reasoning | ganti provider vision/reasoning | **P1** |
| `backend/app/services/redesign_service.py` | analisis gambar referensi | ganti vision analysis provider bila Gemini dilepas penuh | **P1** |
| `backend/app/services/bg_suggest_service.py` | Florence + MiniMax hybrid | pastikan fallback tetap benar | **P2** |
| `backend/app/services/rag_service.py` | embeddings | pisahkan ke provider embedding khusus | **P2** |
| `backend/app/api/designs_routers/generation.py` | image generation path | putuskan apakah tetap Gemini/Imagen atau pindah ke FLUX penuh | **P1** |
| `backend/tests/` | test suite | tambahkan test contract untuk JSON output dan fallback | **P1** |

---

## 11. Tabel env var yang disarankan untuk desain modular

| Variabel | Tujuan | Contoh |
|---|---|---|
| `PRIMARY_LLM_PROVIDER` | memilih provider utama | `minimax`, `openai`, `anthropic`, `gemini` |
| `PRIMARY_LLM_MODEL` | model utama | `minimax-2.7-reasoning` |
| `FALLBACK_LLM_PROVIDER` | provider fallback | `openrouter` |
| `FALLBACK_LLM_MODEL` | model fallback murah | `gpt-5.4-nano-xhigh` atau `qwen/qwen3.5-9b` |
| `VISION_PROVIDER` | provider khusus multimodal/vision | `anthropic`, `openai`, `gemini` |
| `VISION_MODEL` | model vision | `claude-sonnet`, `gpt-4.1` |
| `EMBEDDING_PROVIDER` | provider embedding | `openai`, `voyage`, `gemini` |
| `EMBEDDING_MODEL` | model embedding | `text-embedding-3-small` |
| `MINIMAX_API_KEY` | akses MiniMax | secret |
| `OPENAI_API_KEY` | akses OpenAI | secret |
| `ANTHROPIC_API_KEY` | akses Claude | secret |
| `OPENROUTER_API_KEY` | fallback gateway | secret |

---

## 12. Migration decision matrix

Gunakan tabel ini jika nanti tim ingin mengganti provider dengan risiko minimum.

| Prioritas bisnis | Primary yang disarankan | Fallback yang disarankan | Alasan |
|---|---|---|---|
| **Kualitas terbaik** | Claude Sonnet / GPT-4.1 | MiniMax / Qwen | output stabil dan reasoning kuat |
| **Biaya seimbang** | **MiniMax 2.7 Reasoning** | **GPT 5.4 nano (xhigh)** + Qwen | tradeoff terbaik untuk project ini |
| **Biaya serendah mungkin** | Qwen / DeepSeek | GPT nano | murah, tapi butuh pengujian lebih ketat |
| **Migrasi paling aman** | GPT-4.1 mini | Qwen | pola integrasi relatif umum dan stabil |

---

## 13. Checklist validasi sebelum cut-over penuh

Sebelum cut-over, lakukan pengujian minimal berikut:

- [ ] **JSON validity rate** tinggi untuk semua endpoint yang mengembalikan schema ketat
- [ ] **Bahasa Indonesia** tetap natural pada copywriting dan pertanyaan klarifikasi
- [ ] **Style analysis** dari gambar referensi tetap relevan
- [ ] **Magic text layout** masih mampu menemukan safe area yang masuk akal
- [ ] **Latency** masih diterima untuk UX existing
- [ ] **Fallback path** benar-benar aktif saat provider primary gagal
- [ ] **Cost per request** lebih baik atau minimal sebanding
- [ ] **Regression tests** untuk `llm_design_service`, `llm_copywriting_service`, `brand_kit_generator`, dan `redesign_service` lulus

---

## 14. Final recommendation

Untuk kebutuhan SmartDesign Studio saat ini, keputusan paling sehat adalah:

1. **Tetap pertahankan Fal.ai** untuk seluruh pipeline visual.
2. **Pertahankan MiniMax 2.7 sebagai primary text LLM**, karena migrasinya sudah berjalan di beberapa alur inti.
3. **Jangan langsung memindahkan semua fungsi sisa ke model nano**.
4. Untuk area vision-heavy yang masih memakai Gemini, gunakan salah satu pola berikut:
   - **Preferred:** `Claude Sonnet` / `GPT-4.1` untuk multimodal reasoning, sambil mempertahankan `MiniMax 2.7` sebagai text-reasoning core
   - **Cost-balanced:** `MiniMax 2.7 Reasoning` tetap primary text layer + `GPT 5.4 nano (xhigh)` sebagai cheap fallback + `Fal.ai` untuk image tasks
5. Pisahkan **embedding provider** dari provider chat utama agar arsitektur lebih modular.

> Ringkasnya: kondisi saat ini **sudah menuju MiniMax**, tetapi masih **hybrid**. Dokumentasi ini merefleksikan status terbaru tersebut dan menandai area mana yang masih perlu migrasi bila target akhirnya adalah full keluar dari Gemini.

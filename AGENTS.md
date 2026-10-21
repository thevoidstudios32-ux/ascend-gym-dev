<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Generate branded workout PDFs in the browser from the live program/custom workout hooks, keeping exports current without a second data source.
- Keep landing background playback isolated in a client-safe component using CDN media pointers and a source-derived poster; pause outside the viewport or hidden tabs and skip video for reduced motion/data saving to avoid unnecessary loading.

- Keep initial training assessment validation and catalog-based program generation in a shared client-safe module; reuse ai_programs and training_preferences so training, exports, and Coach share one source.
- Gate new-user assessment in the app layout without changing the managed auth layout; existing onboarded accounts keep their programs and navigation.
- Persist accepted assessments, preferences, and program versions in one authenticated database transaction; rejected proposals never change saved data.
- Resolve exercise technical sheets from the shared catalog and reuse the anatomical SVG for onboarding and read-only highlights; real media stays in asset pointers, unavailable media is never fabricated.
- Resolve media by exact accent-insensitive canonical names and keep movement-specific written instructions in a shared client-safe catalog so missing media never removes execution guidance.
- Preserve atomic workout completion through the RIR-aware wrapper; athlete memory lives in training_preferences and is passed to all training Coach contexts.
- Enrich personalization prompts and read-only proposal sheets from the shared exercise catalog locally; never add AI calls for anatomy, instructions, or demonstrations.
- Keep reviewed motion assets in the shared exercise-motion registry with recording-derived posters; both compact cards and full sheets consume it to avoid duplicate media sources.
- Allow photographic GIF-only demonstrations in the motion registry and reset media state on exercise changes; do not fabricate videos or carry a failed playback state into another exercise.
- Use the unified assessment for all account generations; retain partial compatible answers and persist accepted multiweek plans through authenticated transactional RPCs to preserve history and prevent stale replacements.
- Keep weekly prescriptions inside the active program; starting a week reuses one program/day-linked custom workout and exports consume those same weeks to avoid parallel sources.

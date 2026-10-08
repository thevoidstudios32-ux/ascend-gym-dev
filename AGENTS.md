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

- Keep initial training assessment validation and catalog-based program generation in a shared client-safe module; reuse ai_programs and training_preferences so training, exports, and Coach share one source.
- Gate new-user assessment in the app layout without changing the managed auth layout; existing onboarded accounts keep their programs and navigation.
- Persist accepted assessments, preferences, and program versions in one authenticated database transaction; rejected proposals never change saved data.

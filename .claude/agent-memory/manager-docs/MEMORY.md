# manager-docs Agent Memory

## Project: widget.creator

### Sync Phase Pattern (SPEC lifecycle = Level 1)

For each completed SPEC, the sync phase touches exactly 4 files:

1. `.moai/specs/SPEC-XXX/spec.md` - Change `status: draft` to `status: completed`, append Section 8 Implementation Notes at the end
2. `CHANGELOG.md` - Insert `### Added` subsection under `## [Unreleased]`, AFTER existing `### Fixed` section, BEFORE next versioned section
3. `.moai/project/product.md` - Append to "구현 완료 기능 (Delivered)" list; update "제외 범위" notes if relevant
4. `.moai/project/structure.md` - Add new directories to the relevant package section; update architecture diagram; update "주요 파일 위치 참조" table; bump doc version

### Key Conventions

- All user-facing document content must be in Korean (conversation_language: ko)
- Do NOT modify source code files during sync phase
- Use Edit tool (not Write) for all modifications
- Increment structure.md doc version by 0.1 per sync
- CHANGELOG [Unreleased] section: Fixed comes before Added when both exist

### File Locations

- SPEC documents: `/home/innojini/dev/widget.creator/.moai/specs/`
- Project docs: `/home/innojini/dev/widget.creator/.moai/project/`
- CHANGELOG: `/home/innojini/dev/widget.creator/CHANGELOG.md`

### Structural Divergence Note Pattern

When actual implementation path differs from SPEC spec, record it in Section 8 under "Structural Divergence". This is common for Next.js App Router projects where routes land in `apps/web/app/api/` not `apps/api/src/routes/`.

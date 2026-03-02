"""Deterministic text builders for embeddings.

Even though the public AI API only exposes raw text -> embedding, the platform
needs consistent templates when building candidate/job embeddings.

Normalization rules:
- lowercase
- join arrays with commas
- deterministic order
- never omit fields (use empty string if missing)
"""

from __future__ import annotations

from dataclasses import dataclass


def _norm(value: str | None) -> str:
    return (value or "").strip().lower()


def _join(values: list[str] | None) -> str:
    values = values or []
    cleaned = [_norm(v) for v in values if (v or "").strip()]
    return ", ".join(cleaned)


@dataclass(frozen=True)
class CandidateEmbeddingInput:
    headline: str | None
    bio: str | None
    experience_titles: list[str] | None
    experience_years: list[str] | None
    degrees: list[str] | None
    languages_spoken: list[str] | None
    location: str | None


@dataclass(frozen=True)
class JobEmbeddingInput:
    title: str | None
    description: str | None
    years_of_experience_required: int | None
    employment_type: str | None
    required_languages: list[str] | None
    location: str | None


def build_candidate_embedding_text(data: CandidateEmbeddingInput) -> str:
    # Deterministic ordering and explicit labels.
    headline = _norm(data.headline)
    bio = _norm(data.bio)
    specializations = _join(data.experience_titles)

    experience_titles = _join(data.experience_titles)
    experience_years = _join(data.experience_years)
    experience = ", ".join([s for s in [experience_titles, experience_years] if s])

    education = _join(data.degrees)
    languages = _join(data.languages_spoken)
    location = _norm(data.location)

    return "\n".join(
        [
            f"role: {headline}",
            f"bio: {bio}",
            f"specializations: {specializations}",
            f"experience: {experience}",
            f"education: {education}",
            f"languages: {languages}",
            f"location: {location}",
        ]
    )


def build_job_embedding_text(data: JobEmbeddingInput) -> str:
    title = _norm(data.title)
    description = _norm(data.description)
    years = (
        ""
        if data.years_of_experience_required is None
        else str(int(data.years_of_experience_required))
    )
    employment_type = _norm(data.employment_type)
    required_languages = _join(data.required_languages)
    location = _norm(data.location)

    return "\n".join(
        [
            f"title: {title}",
            f"description: {description}",
            f"required experience: {years} years",
            f"employment type: {employment_type}",
            f"required languages: {required_languages}",
            f"location: {location}",
        ]
    )

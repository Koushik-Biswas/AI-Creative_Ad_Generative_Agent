from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

Platform = Literal['linkedin', 'meta', 'google']
Ratio = Literal['1:1', '1.91:1', '4:5', '9:16']
PLATFORMS = ['linkedin', 'meta', 'google']
SPECS = {'1:1': (1200, 1200), '1.91:1': (1200, 628), '4:5': (1440, 1800), '9:16': (1080, 1920)}

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Claim(Strict):
    text: str = Field(max_length=300)
    sourceId: str
    quote: str = Field(max_length=500)

class Profile(Strict):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(max_length=3000)
    audience: str = Field(max_length=1000)
    industry: str = Field(max_length=150)
    valueProps: list[str] = Field(max_length=8)
    tone: str = Field(max_length=300)
    colors: list[str] = Field(min_length=1, max_length=5)
    claims: list[Claim] = Field(default_factory=list, max_length=12)
    confirmed: bool = False

class Competitor(Strict):
    id: str = Field(max_length=100)
    name: str = Field(min_length=1, max_length=100)
    url: str = Field(max_length=1000)
    type: Literal['direct', 'indirect', 'aspirational']
    verified: bool | None = None

class Evidence(Strict):
    id: str = Field(max_length=100)
    competitor: str = Field(max_length=100)
    platform: Platform
    sourceUrl: str = Field(max_length=2000)
    headline: str = Field(min_length=1, max_length=500)
    body: str = Field(max_length=3000)
    cta: str = Field(max_length=100)
    visual: str = Field(max_length=2500)
    started: str = Field(max_length=30)
    region: str = Field(max_length=100)
    imageAsset: str | None = None
    importedAt: str = Field(max_length=50)

class Insight(Strict):
    id: str
    platform: Platform
    pattern: str
    whitespace: str
    rationale: str
    evidenceIds: list[str]

class ReportResult(Strict):
    summary: str
    insights: list[Insight] = Field(min_length=1, max_length=12)

class Concept(Strict):
    id: str = Field(max_length=100)
    platform: Platform
    title: str = Field(max_length=100)
    angle: str = Field(max_length=150)
    headline: str = Field(min_length=1, max_length=100)
    body: str = Field(max_length=145)
    cta: str = Field(min_length=1, max_length=24)
    visual: str = Field(max_length=1500)
    rationale: str = Field(max_length=2000)
    insightIds: list[str] = Field(max_length=10)
    claimIds: list[str] = Field(max_length=10)
    approved: bool = False

class BriefResult(Strict):
    concepts: list[Concept] = Field(min_length=1, max_length=15)

class SuggestedCompetitor(Strict):
    name: str = Field(min_length=1, max_length=100)
    url: str = Field(max_length=1000)
    type: Literal['direct', 'indirect', 'aspirational']

class Suggestions(Strict):
    competitors: list[SuggestedCompetitor] = Field(min_length=3, max_length=10)

class CopyResult(Strict):
    headline: str = Field(min_length=1, max_length=100)
    body: str = Field(max_length=145)
    cta: str = Field(min_length=1, max_length=24)

class Version(CopyResult):
    version: int = Field(ge=1)
    color: str = Field(pattern=r'^#[a-fA-F0-9]{6}$')
    style: int = Field(ge=0, le=3)
    savedAt: str

class Creative(Version):
    id: str
    conceptId: str
    contextId: str | None = None
    platform: Platform
    ratio: Ratio
    width: int
    height: int
    status: Literal['review', 'approved', 'rejected']
    favorite: bool
    history: list[Version] = Field(default_factory=list, max_length=30)
    createdAt: str

class CampaignSettings(Strict):
    title: str = Field(default='Untitled campaign', min_length=1, max_length=150)
    website: str = Field(default='', max_length=2000)
    description: str = Field(default='', max_length=12000)
    audience: str = Field(default='', max_length=2000)
    goal: str = Field(default='Demo bookings', max_length=200)
    language: str = Field(default='English', max_length=80)
    region: str = Field(default='Global', max_length=150)
    avoid: str = Field(default='', max_length=1000)
    disclaimer: str = Field(default='', max_length=115)
    platforms: list[Platform] = Field(default_factory=lambda: PLATFORMS.copy(), min_length=1, max_length=3)
    ratios: list[Ratio] = Field(default_factory=lambda: ['1:1'], min_length=1, max_length=4)
    variations: int = Field(default=1, ge=1, le=3)

class Rewrite(Strict):
    creativeId: str
    feedback: str = Field(min_length=3, max_length=2000)

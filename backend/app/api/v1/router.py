from fastapi import APIRouter
from app.api.v1.auth.routes import router as auth
from app.api.v1.users.routes import router as users
from app.api.v1.notes.routes import router as notes
from app.api.v1.generate.routes import router as generate
from app.api.v1.documents.routes import router as documents
from app.api.v1.youtube.routes import router as youtube
from app.api.v1.research.routes import router as research
from app.api.v1.quiz.routes import router as quiz
from app.api.v1.flashcards.routes import router as flashcards
from app.api.v1.tutor.routes import router as tutor
from app.api.v1.voice.routes import router as voice
from app.api.v1.search.routes import router as search
from app.api.v1.analytics.routes import router as analytics
from app.api.v1.tasks.routes import router as tasks
from app.api.v1.collaboration.routes import router as collaboration
from app.api.v1.export.routes import router as export
from app.api.v1.exams.routes import router as exams
from app.api.v1.learning.routes import router as learning
from app.api.v1.privacy.routes import router as privacy
from app.api.v1.definitions.routes import router as definitions
from app.api.v1.derivations.routes import router as derivations
from app.api.v1.formulas.routes import router as formulas
from app.api.v1.numericals.routes import router as numericals
from app.api.v1.questions.routes import router as questions
from app.api.v1.pyq.routes import router as pyq
from app.api.v1.revision.routes import router as revision
from app.api.v1.study_plan.routes import router as study_plan
from app.api.v1.studypack.routes import router as studypack
api_router=APIRouter()
for r in [auth,users,notes,generate,documents,youtube,research,quiz,flashcards,tutor,voice,search,analytics,tasks,collaboration,export,exams,learning,privacy,definitions,derivations,formulas,numericals,questions,pyq,revision,study_plan,studypack]:api_router.include_router(r)

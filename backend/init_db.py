from database import engine
from models import Base

def init():
    print("📦 DB 테이블 생성 중...")
    Base.metadata.create_all(bind=engine)
    print("✅ 완료!")

if __name__ == "__main__":
    init()
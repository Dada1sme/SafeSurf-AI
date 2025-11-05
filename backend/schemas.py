from pydantic import BaseModel, EmailStr, Field, model_validator

class SignupRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6, max_length=72)
    confirm_password: str = Field(..., min_length=6, max_length=72)

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("비밀번호가 일치하지 않습니다.")
        return self

class LoginRequest(BaseModel):
    username: str
    password: str

class URLAnalyzeRequest(BaseModel):
    url: str

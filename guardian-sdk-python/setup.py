from setuptools import setup, find_packages

setup(
    name="cyber-guardian",
    version="1.0.0",
    description="Official Python SDK for AI Cyber Guardian: Autonomous Zero-Trust Web Defense Platform",
    long_description=open("README.md", encoding="utf-8").read() if __import__("os").path.exists("README.md") else "",
    long_description_content_type="text/markdown",
    packages=find_packages(),
    install_requires=[
        "httpx>=0.24.0",
    ],
    extras_require={
        "fastapi": ["fastapi>=0.100.0", "starlette>=0.27.0"],
        "flask": ["flask>=2.0.0"],
        "django": ["django>=4.0.0"],
        "all": ["fastapi>=0.100.0", "starlette>=0.27.0", "flask>=2.0.0", "django>=4.0.0"],
    },
    python_requires=">=3.10",
)

#!/usr/bin/env python

from setuptools import find_packages, setup

# Read the long description from README.md
with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

# Project configuration
setup(
    name="teledrive",
    version="1.0.0",
    description="Modern file management for Telegram files with Google Drive-style interface",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="TeleDrive Team",
    author_email="contact@teledrive.dev",
    url="https://github.com/quangminh1212/TeleDrive",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: End Users/Desktop",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Communications :: File Sharing",
        "Topic :: Utilities",
        "Framework :: Flask"
    ],
    python_requires=">=3.8",
    install_requires=[
        "Flask>=2.0.0",
        "Flask-SQLAlchemy>=3.0.0",
        "Flask-Login>=0.6.0",
        "Flask-WTF>=1.1.0",
        "Telethon>=1.26.0",
        "SQLAlchemy>=2.0.0",
        "python-dotenv>=0.21.0",
        "pillow>=9.3.0",
        "openpyxl>=3.0.10",
        "pandas>=1.5.0",
        "cryptography>=38.0.0",
        "werkzeug>=2.2.0",
        "jinja2>=3.1.0",
        "requests>=2.28.0",
        "pydantic>=1.10.0"
    ],
    extras_require={
        "dev": [
            "black>=23.1.0",
            "flake8>=6.0.0",
            "isort>=5.12.0",
            "mypy>=1.0.0",
            "pytest>=7.2.0",
            "pytest-cov>=4.0.0",
            "pre-commit>=3.0.0",
            "bandit>=1.7.0",
        ],
        "production": [
            "gunicorn>=20.1.0",
            "gevent>=22.10.0",
            "psycopg2-binary>=2.9.0",
            "uvicorn>=0.20.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "teledrive=src.teledrive.app:main",
        ],
    },
    include_package_data=True,
    zip_safe=False,
) 
import io
import pymupdf as fitz
from fastapi import UploadFile, BackgroundTasks
from main import upload_book, list_books


def test_upload():
    print("Testing PDF upload functionality...")
    # Create an actual valid 2-page PDF
    doc = fitz.open()
    p1 = doc.new_page()
    p1.insert_text((50, 100), "Athenaeum Upload Test Page 1 - Deep Learning Analysis")
    p2 = doc.new_page()
    p2.insert_text((50, 100), "Athenaeum Upload Test Page 2 - Convex Optimization")
    pdf_bytes = doc.tobytes()
    doc.close()

    upload_file = UploadFile(
        filename="Quantum_Computing_Intro.pdf",
        file=io.BytesIO(pdf_bytes)
    )

    tasks = BackgroundTasks()
    res = upload_book(background_tasks=tasks, file=upload_file)
    print(f"✓ Upload succeeded!")
    print(f"  • ID: {res.id}")
    print(f"  • Title: {res.title}")
    print(f"  • Pages: {res.page_count}")
    print(f"  • Thumb: {res.thumb_path}")
    print(f"  • SHA256: {res.sha256[:16]}...")

    # Verify listed in books
    books = list_books()
    assert any(b.id == res.id for b in books)
    print("✓ Uploaded book verified in list_books()!")


if __name__ == "__main__":
    test_upload()

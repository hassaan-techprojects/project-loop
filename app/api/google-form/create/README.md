# Google Forms Integration — Project LOOP

## Overview

This module is part of **Project LOOP — AI Customer-Feedback Intelligence Platform**.

The purpose of this module is to provide a simple way to create a customer feedback Google Form and connect its responses to:

**Google Form → Google Sheets → CSV → Google Drive**

The generated feedback data can later be used by the main Project LOOP application for feedback ingestion and AI analysis.

The implementation uses **Google Apps Script** to automate Google Form creation, Google Sheets response storage, and CSV file generation.

---

## My Responsibility

This module handles the Google Forms integration for Project LOOP.

### Responsibilities

- Create Google Forms programmatically.
- Add customer feedback fields to the form.
- Connect the Google Form to a Google Spreadsheet.
- Store submitted responses in Google Sheets.
- Generate a CSV file from the response sheet.
- Keep the CSV file updated when new form responses are submitted.
- Expose the functionality through a Google Apps Script Web App.
- Provide the Web App endpoint that can be called by the LOOP application.

### Data Flow

```text
Project LOOP
     |
     | HTTP POST
     v
Google Apps Script Web App
     |
     v
Google Form
     |
     | Customer submits feedback
     v
Google Sheets
     |
     v
CSV File
     |
     v
Google Drive
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const title = String(data.title || "").trim();

    if (!title) {
      return jsonResponse({
        status: "error",
        message: "Form title is required"
      });
    }

    const result = createGoogleForm(title);

    return jsonResponse({
      status: "success",
      ...result
    });

  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error.message
    });
  }
}


function createGoogleForm(title) {

  // Create Google Form
  const form = FormApp.create(title);

  form.setDescription(
    "Customer feedback form created by LOOP."
  );


  // Add questions
  form.addTextItem()
    .setTitle("Name")
    .setRequired(true);


  form.addTextItem()
    .setTitle("Email")
    .setRequired(true);


  form.addParagraphTextItem()
    .setTitle("Feedback")
    .setRequired(true);


  // Create Google Sheet
  const spreadsheet = SpreadsheetApp.create(
    title + " - Responses"
  );


  // Connect Form to Sheet
  form.setDestination(
    FormApp.DestinationType.SPREADSHEET,
    spreadsheet.getId()
  );


  // Create CSV
  const sheet = spreadsheet.getSheets()[0];

  const csvContent = convertSheetToCSV(sheet);

  const csvFile = DriveApp.createFile(
    title + " - Responses.csv",
    csvContent,
    MimeType.CSV
  );


  // Save IDs
  PropertiesService
    .getScriptProperties()
    .setProperty(
      "LOOP_FORM_" + form.getId(),
      JSON.stringify({
        spreadsheetId: spreadsheet.getId(),
        csvFileId: csvFile.getId()
      })
    );


  // Trigger CSV update when form is submitted
  ScriptApp
    .newTrigger("updateCSV")
    .forForm(form)
    .onFormSubmit()
    .create();


  return {
    formUrl: form.getPublishedUrl(),
    editUrl: form.getEditUrl(),
    sheetUrl: spreadsheet.getUrl(),
    csvUrl: csvFile.getUrl(),

    formId: form.getId(),
    spreadsheetId: spreadsheet.getId(),
    csvFileId: csvFile.getId()
  };
}


function updateCSV(event) {

  try {

    const form = event.source;

    const formId = form.getId();

    const saved =
      PropertiesService
        .getScriptProperties()
        .getProperty(
          "LOOP_FORM_" + formId
        );


    if (!saved) {
      console.error(
        "Form configuration not found."
      );
      return;
    }


    const config = JSON.parse(saved);


    const spreadsheet =
      SpreadsheetApp.openById(
        config.spreadsheetId
      );


    const sheet =
      spreadsheet.getSheets()[0];


    const csvContent =
      convertSheetToCSV(sheet);


    const csvFile =
      DriveApp.getFileById(
        config.csvFileId
      );


    csvFile.setContent(csvContent);

  } catch (error) {

    console.error(
      "CSV update failed:",
      error
    );

  }
}


function convertSheetToCSV(sheet) {

  const data =
    sheet
      .getDataRange()
      .getDisplayValues();


  return data
    .map(function(row) {

      return row
        .map(function(value) {

          const escaped =
            String(value)
              .replace(/"/g, '""');

          return '"' + escaped + '"';

        })
        .join(",");

    })
    .join("\n");
}


function jsonResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}



// For testing 
function testCreate() {
  const result = createGoogleForm(
    "LOOP Test Customer Feedback"
  );

  Logger.log(result);
}


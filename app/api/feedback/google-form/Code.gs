const LOOP_API_URL =
  "https://project-loop-theta.vercel.app/api/feedback/google-form";


function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const title = String(data.title || "").trim();
    const workspaceId = String(data.workspaceId || "").trim();
    const webhookSecret = String(data.webhookSecret || "").trim();

    if (!title) {
      return jsonResponse({
        status: "error",
        message: "Form title is required"
      });
    }

    if (!workspaceId) {
      return jsonResponse({
        status: "error",
        message: "Workspace ID is required"
      });
    }

    if (!webhookSecret) {
      return jsonResponse({
        status: "error",
        message: "Webhook secret is required"
      });
    }

    const result = createGoogleForm(
      title,
      workspaceId,
      webhookSecret
    );

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


function createGoogleForm(
  title,
  workspaceId,
  webhookSecret
) {

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


  // Save configuration
  const config = {
    spreadsheetId: spreadsheet.getId(),
    csvFileId: csvFile.getId(),
    workspaceId: workspaceId,
    webhookSecret: webhookSecret
  };


  PropertiesService
    .getScriptProperties()
    .setProperty(
      "LOOP_FORM_" + form.getId(),
      JSON.stringify(config)
    );


  // Create submission trigger
  ScriptApp
    .newTrigger("handleFormSubmit")
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


function handleFormSubmit(event) {

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


    // Update CSV first
    updateCSV(event);


    // Read submitted answers
    const response = event.response;

    const itemResponses =
      response.getItemResponses();


    let name = "";
    let email = "";
    let feedback = "";


    itemResponses.forEach(function(itemResponse) {

      const question =
        itemResponse
          .getItem()
          .getTitle()
          .trim()
          .toLowerCase();


      const answer =
        String(
          itemResponse.getResponse() || ""
        ).trim();


      if (question === "name") {
        name = answer;
      }


      if (question === "email") {
        email = answer;
      }


      if (question === "feedback") {
        feedback = answer;
      }

    });


    if (!feedback) {
      console.error(
        "Feedback answer is empty."
      );
      return;
    }


    // Send feedback to LOOP
    const payload = {
      workspaceId: config.workspaceId,
      secret: config.webhookSecret,
      name: name,
      email: email,
      feedback: feedback,
      sourceRef: response.getId()
    };


    const result =
      UrlFetchApp.fetch(
        LOOP_API_URL,
        {
          method: "post",

          contentType: "application/json",

          payload: JSON.stringify(payload),

          muteHttpExceptions: true
        }
      );


    const statusCode =
      result.getResponseCode();


    const responseText =
      result.getContentText();


    if (
      statusCode < 200 ||
      statusCode >= 300
    ) {

      console.error(
        "LOOP API request failed.",
        statusCode,
        responseText
      );

      return;
    }


    console.log(
      "Feedback successfully sent to LOOP.",
      responseText
    );


  } catch (error) {

    console.error(
      "Google Form submission processing failed:",
      error
    );

  }
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


          return '"' +
            escaped +
            '"';

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


// Testing function
function testCreate() {

  const result =
    createGoogleForm(
      "LOOP Test Customer Feedback",

      "YOUR_WORKSPACE_ID",

      "YOUR_WEBHOOK_SECRET"
    );


  Logger.log(result);
}
document.addEventListener("DOMContentLoaded", () => {
  let eventList = [];
  let currentQueryDate = new Date().toISOString().split("T")[0];
  let eventIdToDelete = null;

  function loadEvents(date) {
    eventList = [];
    const savedEvents = localStorage.getItem(date);
    eventList = savedEvents ? JSON.parse(savedEvents) : [];
    updateEventTable();
  }

  function saveEvents(date) {
    localStorage.setItem(date, JSON.stringify(eventList));
  }

  const dateQueryElement = document.getElementById("date-query");
  if (dateQueryElement) {
    dateQueryElement.value = currentQueryDate;
    loadEvents(currentQueryDate);
  }

  window.exitApp = function () {
    if (confirm("¿Estás seguro de que deseas salir de la aplicación?")) {
      if (typeof Android !== "undefined" && Android.exitApp) {
        Android.exitApp();
      } else {
        alert("Esta función solo está disponible en un entorno Android.");
      }
    }
  };

  window.addEvent = function () {
    const eventNumber = document.getElementById("event-number").value.trim();
    const eventDate = document.getElementById("event-date").value;
    const startTime = document.getElementById("start-time").value;
    const endTime = document.getElementById("end-time").value;
    const reason = document.getElementById("reason").value.trim();

    if (!eventNumber || !eventDate || !startTime || !endTime || !reason) {
      alert("Por favor, completa todos los campos del formulario.");
      return;
    }

    if (startTime >= endTime) {
      alert("La hora de fin no puede ser anterior o igual a la hora de inicio.");
      return;
    }

    const duration = calculateDuration(startTime, endTime);

    const event = {
      id: Date.now(),
      number: eventNumber,
      date: eventDate,
      start: startTime,
      end: endTime,
      duration: duration,
      reason: reason
    };

    let eventListForDate = JSON.parse(localStorage.getItem(eventDate)) || [];
    eventListForDate.push(event);
    localStorage.setItem(eventDate, JSON.stringify(eventListForDate));

    if (eventDate === currentQueryDate) {
      eventList = eventListForDate;
      updateEventTable();
    }

    document.getElementById("event-form").reset();
  };

  function calculateDuration(start, end) {
    const startTime = new Date(`1970-01-01T${start}:00`);
    const endTime = new Date(`1970-01-01T${end}:00`);
    const durationMs = endTime - startTime;

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function updateEventTable() {
    const tbody = document.querySelector("#event-table tbody");
    tbody.innerHTML = "";

    eventList.forEach((event, index) => {
      const row = document.createElement("tr");
      row.setAttribute("data-id", event.id);

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${event.date}</td>
        <td>${event.start}</td>
        <td>${event.end}</td>
        <td>${event.duration}</td>
        <td>${event.reason}</td>
        <td><button class="delete-btn" onclick="showConfirmDialog(${event.id})">Eliminar</button></td>
      `;
      tbody.appendChild(row);
    });
  }

  window.showConfirmDialog = function (id) {
    eventIdToDelete = id;
    document.getElementById("confirm-dialog").style.display = "flex";
  };

  window.closeConfirmDialog = function () {
    document.getElementById("confirm-dialog").style.display = "none";
  };

  document.getElementById("confirm-delete-btn").onclick = function () {
    deleteEvent(eventIdToDelete);
    closeConfirmDialog();
  };

  function deleteEvent(id) {
    const rowToDelete = document.querySelector(`[data-id="${id}"]`);
    if (rowToDelete) {
      rowToDelete.classList.add("fade-out");
      setTimeout(() => {
        rowToDelete.remove();
        eventList = eventList.filter((event) => event.id !== id);
        saveEvents(currentQueryDate);
      }, 300);
    }
  }

  window.queryEventsByDate = function () {
    const queryDateElement = document.getElementById("date-query");
    if (queryDateElement) {
      currentQueryDate = queryDateElement.value;
      loadEvents(currentQueryDate);
    }
  };

  window.showSaveAsDialog = function () {
    document.getElementById("save-as-dialog").style.display = "flex";
  };

  window.closeSaveAsDialog = function () {
    document.getElementById("save-as-dialog").style.display = "none";
  };

  window.saveAs = function () {
    const fileName = document.getElementById("file-name").value.trim();
    const fileExtension = document.getElementById("file-extension").value;

    if (!fileName) {
      alert("Por favor, ingresa un nombre para el archivo.");
      return;
    }

    if (fileExtension === "pdf") {
      saveAsPDF(fileName);
    } else if (fileExtension === "xlsx") {
      saveAsExcel(fileName);
    }

    closeSaveAsDialog();
  };

  function saveAsPDF(fileName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ encoding: "UTF-8" });

    doc.setFontSize(16);
    doc.text("Registro de Paros e Incidencias", 10, 10);
    doc.setFontSize(12);

    const headers = [["#", "Fecha", "Inicio", "Fin", "Duración", "Motivo"]];

    const data = Array.from(
      document.querySelectorAll("#event-table tbody tr")
    ).map((row) => {
      return Array.from(row.cells)
        .slice(0, 6)
        .map((cell) => cell.innerText.normalize("NFC"));
    });

    doc.autoTable({
      head: headers,
      body: data,
      startY: 30,
      margin: { top: 20 },
      styles: {
        cellPadding: 3,
        fontSize: 10,
        valign: "middle",
        halign: "center"
      },
      headStyles: {
        fillColor: [0, 123, 255],
        textColor: 255
      }
    });

    doc.save(`${fileName}.pdf`, { autoBom: true });
  }

  function saveAsExcel(fileName) {
    const data = Array.from(
      document.querySelectorAll("#event-table tbody tr")
    ).map((row, index) => ({
      "Número de Paro": index + 1,
      Fecha: row.cells[1].innerText.normalize("NFC"),
      Inicio: row.cells[2].innerText.normalize("NFC"),
      Fin: row.cells[3].innerText.normalize("NFC"),
      Duración: row.cells[4].innerText.normalize("NFC"),
      Motivo: row.cells[5].innerText.normalize("NFC")
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Paros e Incidencias");

    XLSX.writeFile(wb, `${fileName}.xlsx`, {
      bookType: "xlsx",
      type: "binary"
    });
  }
});

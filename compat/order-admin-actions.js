window.adminAction = async function(oid, status) {
  if (status === "Paid") {
    try {
      await KafakUI.datePicker();
    } catch (error) {
      showAlert(error.message);
      return;
    }
  }
  if (typeof bgFetchController !== "undefined" && bgFetchController) bgFetchController.abort();
  if (status === "Archive") {
    if (!confirm(`Move this order to Archive? (Updates Server Directly)`)) return;
    const btnContainer = $("#admin-btn-container");
    const originalContent = btnContainer.html();
    btnContainer.html('<div class="text-center py-2"><i class="fas fa-spinner fa-spin text-primary"></i> Archiving...</div>');
    orderServiceFetch(sc, {
      method: "POST",
      body: JSON.stringify({
        action: "bulkUpdateStatus",
        updates: [{
          oid,
          status
        }]
      })
    }).then((res) => res.json()).then((data) => {
      if (data.result === "success") {
        let updates2 = JSON.parse(window.kafakStorage.getItem("pendingUpdates") || "[]");
        updates2 = updates2.filter((item) => item.oid !== oid);
        window.kafakStorage.setItem("pendingUpdates", JSON.stringify(updates2));
        Swal.fire({
          icon: "success",
          title: "Archived!",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 1500
        });
        updateAdminUI(status, oid);
      } else {
        alert("Failed to Archive!");
        btnContainer.html(originalContent);
      }
    }).catch((err) => {
      alert("Network Error");
      btnContainer.html(originalContent);
    });
    return;
  }
  let selectedDate = null;
  if (status === "Paid") {
    const _await$Swal$fire = await Swal.fire({
      title: "Mark as PAID",
      html: `
            <div style="text-align:center;">
                <label style="font-size:12px; color:#666; font-weight:700; margin-bottom:5px; display:block;">SELECT PAYMENT TIME</label>
                <input type="text" id="flatpickr-paid" class="form-control text-center fw-bold" 
                       style="font-size:18px; padding:10px; border:2px solid #eee; border-radius:12px;" 
                       placeholder="Select Date...">
            </div>
          `,
      showCancelButton: true,
      confirmButtonText: "Save Paid",
      confirmButtonColor: "#28a745",
      focusConfirm: false,
      didOpen: () => {
        flatpickr("#flatpickr-paid", {
          enableTime: true,
          dateFormat: "Y-m-d H:i",
          defaultDate: /* @__PURE__ */ new Date(),
          theme: "material_blue",
          time_24hr: true,
          disableMobile: true
        });
      },
      preConfirm: () => {
        return document.getElementById("flatpickr-paid").value;
      }
    }), dateVal = _await$Swal$fire.value;
    if (!dateVal) return;
    selectedDate = dateVal;
  } else {
    if (!confirm(`Mark as '${status}'? (Saved Locally)`)) return;
    if (status === "Dispatched") {
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      selectedDate = `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  }
  let updates = JSON.parse(window.kafakStorage.getItem("pendingUpdates") || "[]");
  const previousStatusUpdate = updates.find((item) => item.oid === oid && (!item.action || item.action === "status"));
  updates = updates.filter((item) => item.oid !== oid || item.action && item.action !== "status");
  let oldStatus = "Pending";
  let cached = JSON.parse(window.kafakStorage.getItem("allOrdersCache") || "[]");
  let foundOrder = cached.find((o) => o.orderid === oid);
  if (typeof userData !== "undefined" && userData.orderid === oid) {
    oldStatus = userData.Status || "Pending";
  } else if (foundOrder) {
    oldStatus = foundOrder.Status;
  }
  let currentMeta = "";
  if (typeof savedOrderData !== "undefined" && savedOrderData.orderid === oid) {
    currentMeta = savedOrderData.adminMeta || "";
  } else if (foundOrder) {
    currentMeta = foundOrder.adminMeta || "";
  }
  let cleanMeta = currentMeta;
  let metaCleaned = false;
  if (["Pending", "Sent", "pending", "sent"].includes(oldStatus.toLowerCase()) && status === "Paid") {
    if (currentMeta.includes("P") || currentMeta.includes("S") || currentMeta.includes("T")) {
      cleanMeta = currentMeta.replace(/P_\d+/g, "").replace(/[PST]/g, "").replace(/\s+/g, " ").trim();
      metaCleaned = true;
    }
  }
  let needsRefundDelete = false;
  if (String(oldStatus).trim().toLowerCase() === "refunded" && status !== "Refunded") {
    needsRefundDelete = true;
    console.log("Refund deletion queued for sync...");
  }
  updates.push({
    oid,
    status,
    oldStatus: (previousStatusUpdate === null || previousStatusUpdate === void 0 ? void 0 : previousStatusUpdate.oldStatus) || oldStatus,
    actionDate: selectedDate,
    time: (/* @__PURE__ */ new Date()).getTime(),
    deleteRefund: needsRefundDelete
  });
  if (metaCleaned) {
    let metaIdx = updates.findIndex((u) => u.oid === oid && u.action === "meta" && u.provider === void 0);
    if (metaIdx > -1) updates[metaIdx].meta = cleanMeta;
    else updates.push({
      oid,
      action: "meta",
      meta: cleanMeta,
      oldMeta: currentMeta,
      time: (/* @__PURE__ */ new Date()).getTime()
    });
  }
  window.kafakStorage.setItem("pendingUpdates", JSON.stringify(updates));
  if (typeof savedOrderData !== "undefined" && savedOrderData) {
    updateLocalCache(savedOrderData, status);
    if (metaCleaned) {
      savedOrderData.adminMeta = cleanMeta;
      if (typeof userData !== "undefined") userData.adminMeta = cleanMeta;
    }
  } else if (foundOrder) {
    foundOrder.Status = status;
    if (metaCleaned) foundOrder.adminMeta = cleanMeta;
    window.kafakStorage.setItem("allOrdersCache", JSON.stringify(cached));
  }
  if (typeof userData !== "undefined") userData.Status = status;
  if (typeof savedOrderData !== "undefined") savedOrderData.Status = status;
  Swal.fire({
    icon: "success",
    title: `Saved: ${status}`,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1500
  });
  updateAdminUI(status, oid);
};

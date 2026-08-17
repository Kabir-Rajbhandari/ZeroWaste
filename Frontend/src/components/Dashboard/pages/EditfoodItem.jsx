import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  colors,
  fonts,
  btnPrimaryStyle,
  btnOutlineStyle,
} from "../../../theme";
import { foodApi } from "../../../services/api";
import { logActivity } from "../../../utils/activitylog";

const CATEGORIES = ["Dairy", "Meat", "Fruits", "Vegetable", "Other"];
const UNITS = ["Kg", "Ltr", "Gram"];
const STORAGE_LOCATIONS = ["Fridge", "Freezer", "Pantry", "Counter"];

const inputStyle = {
  borderColor: colors.greenLrgb,
  borderWidth: "2px",
  borderRadius: 8,
  fontSize: "0.9rem",
  padding: "0.7rem 1rem",
};

export default function EditFoodItem({ item, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    name: item.name || "",
    category: item.category || "",
    quantity: item.quantity ?? "",
    quantityUnit: item.quantityUnit || "Kg",
    expiryDate: item.expiryDate ? item.expiryDate.split("T")[0] : "",
    imageUrl: item.imageUrl || "",
    storageLocation: item.storageLocation || "",
    notes: item.notes || "",
  });
  const [status, setStatus] = useState("idle");
  const [errMsg, setErrMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrMsg("Food name is required.");
      setStatus("error");
      return;
    }
    if (!form.category) {
      setErrMsg("Please select a category.");
      setStatus("error");
      return;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      setErrMsg("Enter a valid quantity.");
      setStatus("error");
      return;
    }
    if (!form.expiryDate) {
      setErrMsg("Expiry date is required.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrMsg("");
    try {
      await foodApi.update(item.id, {
        name: form.name.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        quantityUnit: form.quantityUnit,
        expiryDate: form.expiryDate,
        imageUrl: form.imageUrl.trim() || null,
        storageLocation: form.storageLocation || null,
        notes: form.notes.trim() || null,
      });
      logActivity(`Updated ${form.name.trim()}`);
      setStatus("success");
      setTimeout(() => onSuccess?.(), 600);
    } catch (err) {
      setErrMsg(err.message);
      setStatus("error");
    }
  };

  return (
    <div>
      <style>
        {`

          .save-btn {
            opacity: 0.75;
            transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
          }

          .save-btn:hover:not(:disabled) {
            opacity: 1;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }            

          .cancel-btn:hover{
            opacity: 1 !important;
            background:${colors.greenLrgb};
            border-color: transparent;
          }
          `}
      </style>
      <button
        type="button"
        className="btn d-inline-flex align-items-center gap-2 mb-3 p-0"
        style={{
          color: colors.muted,
          fontSize: "0.875rem",
          background: "none",
          border: "none",
        }}
        onClick={onCancel}
      >
        <ArrowLeft size={18} /> Back to inventory
      </button>

      <h1
        style={{
          fontFamily: fonts.body,
          fontSize: "1.60rem",
          fontWeight: 700,
          opacity: 0.75,
          color: colors.charcoal,
          marginBottom: "0.25rem",
        }}
      >
        Edit Food Item
      </h1>
      <p className="mb-4" style={{ color: colors.muted }}>
        Update the details for <strong>{item.name}</strong>.
      </p>

      <div
        className="rounded-4 p-4 p-lg-5"
        style={{
          border: "none",
          maxWidth: 560,
          background: colors.authBg,
          boxShadow: "0 0px 5px rgb(169, 169, 169)",
        }}
      >
        {status === "error" && (
          <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>
        )}
        {status === "success" && (
          <div className="alert alert-success py-2 small mb-3">
            Changes saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div>
            <label htmlFor="edit-name" className="form-label fw-semibold small">
              Food name
            </label>
            <input
              id="edit-name"
              name="name"
              type="text"
              className="form-control"
              style={inputStyle}
              placeholder="e.g. Whole Milk"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label
              htmlFor="edit-category"
              className="form-label fw-semibold small"
            >
              Category
            </label>
            <select
              id="edit-category"
              name="category"
              className="form-select"
              style={inputStyle}
              value={form.category}
              onChange={handleChange}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="row g-3">
            <div className="col-7">
              <label
                htmlFor="edit-quantity"
                className="form-label fw-semibold small"
              >
                Quantity
              </label>
              <input
                id="edit-quantity"
                name="quantity"
                type="number"
                min="0.01"
                step="0.01"
                className="form-control"
                style={inputStyle}
                placeholder="e.g. 2"
                value={form.quantity}
                onChange={handleChange}
              />
            </div>
            <div className="col-5">
              <label
                htmlFor="edit-quantityUnit"
                className="form-label fw-semibold small"
              >
                Unit
              </label>
              <select
                id="edit-quantityUnit"
                name="quantityUnit"
                className="form-select"
                style={inputStyle}
                value={form.quantityUnit}
                onChange={handleChange}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-expiryDate"
              className="form-label fw-semibold small"
            >
              Expiry date
            </label>
            <input
              id="edit-expiryDate"
              name="expiryDate"
              type="date"
              className="form-control"
              style={inputStyle}
              value={form.expiryDate}
              onChange={handleChange}
            />
          </div>

          <div>
            <label
              htmlFor="edit-storageLocation"
              className="form-label fw-semibold small"
            >
              Storage <span className="text-muted fw-normal">(optional)</span>
            </label>
            <select
              id="edit-storageLocation"
              name="storageLocation"
              className="form-select"
              style={inputStyle}
              value={form.storageLocation}
              onChange={handleChange}
            >
              <option value="">Storage Location</option>
              {STORAGE_LOCATIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-notes"
              className="form-label fw-semibold small"
            >
              Notes <span className="text-muted fw-normal">(optional)</span>
            </label>
            <textarea
              id="edit-notes"
              name="notes"
              className="form-control"
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              placeholder="Any remarks about this item…"
              value={form.notes}
              onChange={handleChange}
            />
          </div>

          <div>
            <label
              htmlFor="edit-imageUrl"
              className="form-label fw-semibold small"
            >
              Image URL <span className="text-muted fw-normal">(optional)</span>
            </label>
            <input
              id="edit-imageUrl"
              name="imageUrl"
              type="text"
              className="form-control"
              style={inputStyle}
              placeholder="https://..."
              value={form.imageUrl}
              onChange={handleChange}
            />
          </div>

          <div className="d-flex gap-2 mt-2">
            <button
              type="submit"
              className="btn btn-primary flex-grow-1 save-btn"
              style={{
                ...btnPrimaryStyle,
                borderRadius: 4,
                fontWeight: 600,
                padding: "0.45rem 1.15rem",
                fontSize: "0.9rem",
                color: colors.white,
              }}
              disabled={status === "loading"}
            >
              Save Changes
            </button>
            <button
              type="button"
              className="btn cancel-btn"
              style={{
                ...btnOutlineStyle,
                opacity: 0.65,
                borderColor: colors.green,
                color: colors.charcoal,
                fontWeight: 600,
                borderRadius: 4,
                borderWidth: "2px",
                padding: "0.45rem 1.25rem",
                fontSize: "0.9rem",
                transition: "all 0.5s ease",
              }}
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

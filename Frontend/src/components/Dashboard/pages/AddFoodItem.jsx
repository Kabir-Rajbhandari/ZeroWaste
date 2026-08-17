import { useRef, useState } from "react";
import { ArrowLeft, ChevronRight, ImagePlus } from "lucide-react";
import {
  colors,
  fonts,
  btnPrimaryStyle,
  btnOutlineStyle,
} from "../../../theme";
import { foodApi } from "../../../services/api";
import { logActivity } from "../../../utils/activitylog";

const CATEGORIES = ["Fruits", "Vegetable", "Dairy", "Meat", "Other"];
const UNITS = ["Kg", "Ltr", "Gram"];
const STORAGE_LOCATIONS = ["Fridge", "Freezer", "Pantry", "Counter"];

const inputStyle = {
  borderColor: colors.greenLrgb,
  borderWidth: "2px",
  borderRadius: 8,
  fontSize: "0.9rem",
  padding: "0.7rem 1rem",
  background: colors.white,
};

const labelStyle = {
  fontWeight: 700,
  fontSize: "0.95rem",
  color: colors.charcoal,
  marginBottom: "0.4rem",
};

const INITIAL = {
  name: "",
  category: "",
  quantity: "",
  quantityUnit: "Kg",
  expiryDate: "",
  storage: "",
  notes: "",
  imageUrl: "",
};

const MAX_DIMENSION = 900;
const JPEG_QUALITY = 0.75;
const MAX_SOURCE_FILE_BYTES = 15 * 1024 * 1024;

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      reject(
        new Error("That image is too large. Please choose a photo under 15MB."),
      );
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not process the selected image."));
            return;
          }
          const compressedReader = new FileReader();
          compressedReader.onload = () => resolve(compressedReader.result);
          compressedReader.onerror = reject;
          compressedReader.readAsDataURL(blob);
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the selected image."));
    };

    img.src = objectUrl;
  });
}

export default function AddFoodItem({ onSuccess, onCancel }) {
  const [form, setForm] = useState(INITIAL);
  const [errMsg, setErrMsg] = useState("");
  const [status, setStatus] = useState("idle");
  const [imagePreview, setImagePreview] = useState("");

  const [uploadedImageData, setUploadedImageData] = useState("");
  const galleryInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "imageUrl") {
      setUploadedImageData("");
      setImagePreview(value);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrMsg("Please choose a valid image file.");
      return;
    }
    try {
      const dataUrl = await compressImageFile(file);
      setUploadedImageData(dataUrl);
      setForm((prev) => ({ ...prev, imageUrl: "" }));
      setImagePreview(dataUrl);
      setErrMsg("");
    } catch (err) {
      setErrMsg(err.message || "Could not read the selected image.");
    } finally {
      e.target.value = "";
    }
  };

  const resetForm = () => {
    setForm(INITIAL);
    setImagePreview("");
    setUploadedImageData("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setErrMsg("Food name is required.");
    if (!form.category) return setErrMsg("Please select a category.");
    if (!form.quantity.trim() || Number(form.quantity) <= 0)
      return setErrMsg("Enter a valid quantity.");
    if (!form.expiryDate) return setErrMsg("Expiry date is required.");
    // Storage location is optional per the use case — no validation here.

    setErrMsg("");
    setStatus("loading");

    try {
      await foodApi.create({
        name: form.name.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        quantityUnit: form.quantityUnit,
        expiryDate: form.expiryDate,
        imageUrl: uploadedImageData || form.imageUrl.trim() || null,
        storageLocation: form.storage || null,
        notes: form.notes.trim() || null,
      });
      logActivity(`Added ${form.name.trim()}`);
      resetForm();
      onSuccess?.();
    } catch (err) {
      setErrMsg(err.message || "Failed to save item.");
      setStatus("idle");
    }
  };

  return (
    <div>
      {onCancel && (
        <button
          type="button"
          className="btn btn-link p-0 d-inline-flex align-items-center gap-1 mb-3"
          style={{ color: colors.charcoal, fontWeight: 600 }}
          onClick={onCancel}
        >
          <ArrowLeft size={18} /> Back
        </button>
      )}

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

          .cancel-btn{
            transition: all 0.25s ease;
          }

          .cancel-btn:hover{
            opacity: 1 !important;
            background:${colors.greenLrgb};
            border-color: transparent;
          }
          `}
      </style>

      <h1
        style={{
          fontFamily: fonts.body,
          fontSize: "1.60em",
          fontWeight: 700,
          color: colors.charcoal,
          marginBottom: "0.25rem",
          opacity: 0.75,
        }}
      >
        Add Food Items
      </h1>
      <p className="mb-4" style={{ color: colors.muted }}>
        Add new food items to keep your inventory up to date.
      </p>

      <div
        className="rounded-4 p-4 p-lg-4"
        style={{
          background: colors.authBg,
          border: "none",
          boxShadow: "0 0px 5px rgb(169, 169, 169)",
        }}
      >
        {errMsg && (
          <div className="alert alert-danger py-2 small mb-3">{errMsg}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row g-4">
            <div className="col-12 col-md-4">
              <label className="form-label" style={labelStyle}>
                Food Name
              </label>
              <input
                type="text"
                name="name"
                className="form-control"
                style={inputStyle}
                placeholder="Apple"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label" style={labelStyle}>
                Category
              </label>
              <div className="position-relative">
                <select
                  name="category"
                  className="form-select"
                  style={{ ...inputStyle, appearance: "none" }}
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
                <ChevronRight
                  size={16}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: colors.muted,
                  }}
                />
              </div>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label" style={labelStyle}>
                Quantity
              </label>
              <div className="d-flex gap-2">
                <input
                  type="number"
                  name="quantity"
                  min="0.01"
                  step="0.01"
                  className="form-control"
                  style={inputStyle}
                  placeholder="2"
                  value={form.quantity}
                  onChange={handleChange}
                />
                <select
                  name="quantityUnit"
                  className="form-select"
                  style={{ ...inputStyle, maxWidth: 90 }}
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

            <div className="col-12 col-md-4">
              <label className="form-label" style={labelStyle}>
                Expiry Date
              </label>
              <div className="position-relative">
                <input
                  type="date"
                  name="expiryDate"
                  className="form-control"
                  style={{ ...inputStyle, paddingRight: "2.5rem" }}
                  value={form.expiryDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label" style={labelStyle}>
                Storage (Optional)
              </label>
              <div className="position-relative">
                <select
                  name="storage"
                  className="form-select"
                  style={{ ...inputStyle, appearance: "none" }}
                  value={form.storage}
                  onChange={handleChange}
                >
                  <option value="">Storage Location</option>
                  {STORAGE_LOCATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronRight
                  size={16}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: colors.muted,
                  }}
                />
              </div>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label" style={labelStyle}>
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                className="form-control"
                style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
                placeholder="Food is .."
                value={form.notes}
                onChange={handleChange}
              />
            </div>

            <div className="col-12">
              <label className="form-label" style={labelStyle}>
                Browse Image
              </label>
              <div className="d-flex align-items-center gap-2 mb-2">
                <input
                  type="text"
                  name="imageUrl"
                  className="form-control"
                  style={{ ...inputStyle, maxWidth: 560 }}
                  placeholder="https://example.com/food-image.jpg"
                  value={form.imageUrl}
                  onChange={handleChange}
                />
              </div>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="d-none"
                onChange={handleFileSelect}
              />

              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn d-inline-flex align-items-center gap-2"
                  style={{
                    ...btnOutlineStyle,
                    marginTop: "1rem",
                    background: colors.showcase_green,
                  }}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImagePlus size={16} /> Choose from gallery
                </button>
              </div>

              {imagePreview && (
                <div className="mt-3">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="rounded-3 border"
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: "cover",
                      borderColor: colors.border,
                    }}
                    onError={() => setImagePreview("")}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="d-flex gap-3 justify-content-center mt-4">
            <button
              type="submit"
              className="btn px-4 save-btn"
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
              Save Item
            </button>
            {onCancel && (
              <button
                type="button"
                className="btn px-4 cancel-btn"
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
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

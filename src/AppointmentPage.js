// AppointmentPage.js
import React from "react";
import { useParams } from "react-router-dom";
import vets from "./wetopinie_ALL_cleaned.json";
import AppointmentForm from "./AppointmentForm";

export default function AppointmentPage({ user }) {
  const { id } = useParams();
  const vet = vets.find(v => String(v.id) === String(id));
  if (!vet) return <div>Nie znaleziono tej lecznicy.</div>;
  return (
    <div style={{ maxWidth: 700, margin: "40px auto" }}>
      <h2>Umów wizytę w: {vet.NAME}</h2>
      <AppointmentForm
        clinicEmail={vet.EMAIL}
        vetName={vet.NAME}
        user={user}
      />
    </div>
  );
}

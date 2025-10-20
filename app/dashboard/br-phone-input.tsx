"use client";

import { useState } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

export default function BrPhoneInput({ name }: { name?: string }) {
  const [phone, setPhone] = useState("");
  return (
    <PhoneInput
      name={name}
      defaultCountry="br"
      value={phone}
      onChange={setPhone}
    ></PhoneInput>
  );
}

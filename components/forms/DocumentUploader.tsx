'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { PropertyDocument, DocType, ListingType } from '../../types/property';

interface DocumentUploaderProps {
  propertyId?: string;
  documents: PropertyDocument[];
  onChange: (documents: PropertyDocument[]) => void;
  listingType: ListingType;
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  TITLE_DOC: 'Title Document',
  SURVEY_PLAN: 'Survey Plan',
  BUILDING_APPROVAL: 'Building Approval',
  PROOF_OF_OWNERSHIP: 'Proof of Ownership',
  TENANCY_CLEARANCE: 'Tenancy Clearance',
  OTHER: 'Other Document'
};

const REQUIRED_DOCS: Record<ListingType, DocType[]> = {
  [ListingType.SALE]: ['TITLE_DOC', 'SURVEY_PLAN', 'BUILDING_APPROVAL'],
  [ListingType.RENT]: ['PROOF_OF_OWNERSHIP'],
  [ListingType.LEAD_GEN]: []
};

export function DocumentUploader({
  propertyId: _propertyId,
  documents,
  onChange,
  listingType,
}: DocumentUploaderProps) {
  const fileInputRefs = useRef<Partial<Record<DocType, HTMLInputElement | null>>>({});

  const requiredDocs = REQUIRED_DOCS[listingType];
  const optionalDocs: DocType[] = ['TENANCY_CLEARANCE', 'OTHER'];

  const hasDocument = (docType: DocType) => {
    return documents.some(doc => doc.docType === docType);
  };

  const handleFileSelect = (file: File, docType: DocType) => {
    const existingIndex = documents.findIndex(doc => doc.docType === docType);
    const newDoc: PropertyDocument = {
      id: `doc-${Date.now()}`,
      docType,
      name: file.name
    };

    if (existingIndex >= 0) {
      // Replace existing
      const updated = [...documents];
      updated[existingIndex] = newDoc;
      onChange(updated);
    } else {
      // Add new
      onChange([...documents, newDoc]);
    }
  };

  const removeDocument = (docType: DocType) => {
    onChange(documents.filter(doc => doc.docType !== docType));
  };

  const getDocument = (docType: DocType) => {
    return documents.find(doc => doc.docType === docType);
  };

  return (
    <div className="space-y-4">
      {/* Required Documents */}
      {requiredDocs.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Required Documents
          </label>
          <div className="space-y-3">
            {requiredDocs.map((docType) => {
              const doc = getDocument(docType);
              const hasDoc = hasDocument(docType);

              return (
                <div key={docType} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {DOC_TYPE_LABELS[docType]}
                        <span className="text-red-500 ml-1">*</span>
                      </p>
                      {doc && (
                        <p className="text-xs text-gray-500">{doc.name}</p>
                      )}
                    </div>
                  </div>
                  {hasDoc ? (
                    <button
                      type="button"
                      onClick={() => removeDocument(docType)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label={`Remove ${DOC_TYPE_LABELS[docType]}`}
                    >
                      <X size={18} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[docType]?.click()}
                      className="px-4 py-2 text-sm font-medium text-reach-red border border-reach-red rounded-lg hover:bg-reach-red/5 transition-colors"
                    >
                      Upload
                    </button>
                  )}
                  <input
                    ref={(el) => {
                      if (el) {
                        fileInputRefs.current[docType] = el;
                      } else {
                        delete fileInputRefs.current[docType];
                      }
                    }}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file, docType);
                      e.target.value = '';
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional Documents */}
      {listingType === ListingType.RENT && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Optional Documents
          </label>
          <div className="space-y-3">
            {optionalDocs.map((docType) => {
              const doc = getDocument(docType);
              const hasDoc = hasDocument(docType);

              return (
                <div key={docType} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="text-gray-400" size={20} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {DOC_TYPE_LABELS[docType]}
                      </p>
                      {doc && (
                        <p className="text-xs text-gray-500">{doc.name}</p>
                      )}
                    </div>
                  </div>
                  {hasDoc ? (
                    <button
                      type="button"
                      onClick={() => removeDocument(docType)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label={`Remove ${DOC_TYPE_LABELS[docType]}`}
                    >
                      <X size={18} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[docType]?.click()}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Upload
                    </button>
                  )}
                  <input
                    ref={(el) => {
                      if (el) {
                        fileInputRefs.current[docType] = el;
                      } else {
                        delete fileInputRefs.current[docType];
                      }
                    }}
                    id={`doc-upload-opt-${docType}`}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    aria-label={`Upload ${DOC_TYPE_LABELS[docType]}`}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file, docType);
                      e.target.value = '';
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


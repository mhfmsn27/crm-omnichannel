'use client';

import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

const DocumentationPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">API Documentation</h1>
      <div className="p-4 bg-white rounded-xl shadow-xl overflow-hidden">
        { }
        <SwaggerUI url="/openapi.json" />
      </div>
    </div>
  );
};

export default DocumentationPage;

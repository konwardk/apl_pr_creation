import React from 'react';
import { Head, router } from '@inertiajs/react';
import SapAppLayout from '@/layouts/sap-app-layout';
import PurchaseRequisitionForm from '@/components/sap/PurchaseRequisitionForm';
import { SapMasterDataConfig } from '@/components/sap/sapMasterData';
import { HeaderOption, PrDocumentType } from '@/types';

interface CreatePrPageProps {
    masterData?: Partial<SapMasterDataConfig>;
    headerOptions?: HeaderOption[];
    prDocumentTypes?: PrDocumentType[];
}

export default function CreatePurchaseRequisitionPage({
    masterData,
    headerOptions = [],
    prDocumentTypes = [],
}: CreatePrPageProps) {
    return (
        <SapAppLayout
            title="Create Purchase Requisition - SAP S/4HANA Cloud"
            activeTab="requisitions"
            onTabChange={(tab) => {
                if (tab === 'overview' || tab === 'requisitions') {
                    router.visit('/dashboard');
                }
            }}
            onOpenCreatePr={() => {}}
        >
            <Head title="Create Purchase Requisition - SAP S/4HANA Cloud" />

            <div className="space-y-6">
                <PurchaseRequisitionForm
                    masterData={masterData}
                    headerOptions={headerOptions}
                    prDocumentTypes={prDocumentTypes}
                />
            </div>
        </SapAppLayout>
    );
}

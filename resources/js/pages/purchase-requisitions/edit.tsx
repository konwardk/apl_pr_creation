import React from 'react';
import { Head, router } from '@inertiajs/react';
import SapAppLayout from '@/layouts/sap-app-layout';
import PurchaseRequisitionForm from '@/components/sap/PurchaseRequisitionForm';
import { SapMasterDataConfig } from '@/components/sap/sapMasterData';
import { HeaderOption, PrDocumentType, ItemCategory } from '@/types';

interface EditPrPageProps {
    purchaseRequisition: any;
    masterData?: Partial<SapMasterDataConfig>;
    headerOptions?: HeaderOption[];
    prDocumentTypes?: PrDocumentType[];
    itemCategories?: ItemCategory[];
    defaultCrNo?: string;
}

export default function EditPurchaseRequisitionPage({
    purchaseRequisition,
    masterData,
    headerOptions = [],
    prDocumentTypes = [],
    itemCategories = [],
    defaultCrNo,
}: EditPrPageProps) {
    return (
        <SapAppLayout
            title={`Edit PR ${purchaseRequisition?.pr_number || ''} - SAP S/4HANA Cloud`}
            activeTab="requisitions"
            onTabChange={(tab) => {
                if (tab === 'overview' || tab === 'requisitions') {
                    router.visit('/dashboard');
                }
            }}
            onOpenCreatePr={() => {}}
        >
            <Head title={`Edit PR ${purchaseRequisition?.pr_number || ''} - SAP S/4HANA Cloud`} />

            <div className="space-y-6">
                <PurchaseRequisitionForm
                    initialData={purchaseRequisition}
                    masterData={masterData}
                    headerOptions={headerOptions}
                    prDocumentTypes={prDocumentTypes}
                    itemCategories={itemCategories}
                    defaultCrNo={defaultCrNo}
                />
            </div>
        </SapAppLayout>
    );
}

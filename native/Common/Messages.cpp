//
// Copyright (C) Microsoft. All rights reserved.
//

#include "stdafx.h"
#include "Messages.h"

PCOPYDATASTRUCT MakeCopyDataStructCopy(_In_ const PCOPYDATASTRUCT pCopyDataStruct)
{
    PCOPYDATASTRUCT const pCopyDataStructCopy = new COPYDATASTRUCT;
    pCopyDataStructCopy->dwData = pCopyDataStruct->dwData;
    pCopyDataStructCopy->cbData = pCopyDataStruct->cbData;
    pCopyDataStructCopy->lpData = new BYTE[pCopyDataStructCopy->cbData];

    ::CopyMemory(pCopyDataStructCopy->lpData, pCopyDataStruct->lpData, pCopyDataStructCopy->cbData);

    return pCopyDataStructCopy;
}

void FreeCopyDataStructCopy(_In_ PCOPYDATASTRUCT pCopyDataStructCopy)
{
    delete[](BYTE*) pCopyDataStructCopy->lpData;
    delete pCopyDataStructCopy;
}

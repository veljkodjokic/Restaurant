@auth()
    @if(\Auth::user()->isAdmin())
        @include('layouts.navbars.navs.admin')
    @else
        @include('layouts.navbars.navs.auth')
    @endif
@endauth